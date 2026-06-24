import type { dbClient } from "@banana/db/client";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { env } from "next-runtime-env";

import * as cardRepo from "@banana/db/repository/card.repo";
import * as memberRepo from "@banana/db/repository/member.repo";
import * as notificationRepo from "@banana/db/repository/notification.repo";
import * as userRepo from "@banana/db/repository/user.repo";
import * as workspaceRepo from "@banana/db/repository/workspace.repo";
import { cardToWorkspaceMembers, workspaceMembers } from "@banana/db/schema";
import { sendEmail } from "@banana/email";
import { createLogger } from "@banana/logger";
import { parseMentionsFromHTML } from "@banana/shared/utils";

import type { PushPayload } from "./push";
import { sendPushToUser } from "./push";

const log = createLogger("notifications");

function buildCardPushPayload(
  actorName: string,
  verb: string,
  cardTitle: string,
  cardPublicId: string,
): PushPayload {
  return {
    title: `${actorName} ${verb}`,
    body: cardTitle,
    url: `/cards/${cardPublicId}`,
  };
}

export async function sendMentionEmails({
  db,
  cardPublicId,
  commentHtml,
  commenterUserId,
  commentId,
}: {
  db: dbClient;
  cardPublicId: string;
  commentHtml: string;
  commenterUserId: string;
  commentId?: number;
}) {
  try {
    const mentionPublicIds = parseMentionsFromHTML(commentHtml);
    if (mentionPublicIds.length === 0) return;

    const card = await cardRepo.getWithListAndMembersByPublicId(
      db,
      cardPublicId,
    );
    if (!card?.list.board) return;

    const board = card.list.board;
    const boardName = board.name;
    const cardTitle = card.title;
    const cardId = card.id;

    const workspace = await workspaceRepo.getByPublicId(
      db,
      board.workspace.publicId,
    );
    if (!workspace?.id) return;

    const workspaceId = workspace.id;

    // Get commenter information
    const commenter = await userRepo.getById(db, commenterUserId);
    if (!commenter) return;

    const commenterName = commenter.name?.trim() || commenter.email;

    const membersWithDetails = await memberRepo.getByPublicIdsWithUsers(
      db,
      mentionPublicIds,
      workspaceId,
    );

    const membersToNotify = membersWithDetails.filter(
      (member) => member.user?.id !== commenterUserId,
    );

    if (membersToNotify.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const cardUrl = `${baseUrl}/cards/${cardPublicId}`;

    const emailEnabled =
      env("NEXT_PUBLIC_DISABLE_EMAIL")?.toLowerCase() !== "true";

    log.info(
      { cardPublicId, mentionCount: membersToNotify.length, commenterUserId },
      "Sending mention emails",
    );
    await Promise.all(
      membersToNotify.map(async (member) => {
        const userId = member.user?.id;
        const email = member.user?.email ?? member.email;

        if (!userId || !email) return;

        try {
          const notificationExists = await notificationRepo.exists(db, {
            userId,
            cardId,
            type: "mention",
          });

          if (notificationExists) {
            log.debug(
              { email, cardPublicId },
              "Skipping duplicate mention email",
            );
            return;
          }

          await notificationRepo.create(db, {
            type: "mention",
            userId,
            cardId,
            commentId,
          });

          await sendPushToUser(
            db,
            userId,
            buildCardPushPayload(
              commenterName,
              "mentioned you",
              cardTitle,
              cardPublicId,
            ),
          );

          if (emailEnabled) {
            await sendEmail(
              email,
              `${commenterName} mentioned you in a comment on ${cardTitle}`,
              "MENTION",
              {
                commenterName,
                boardName,
                cardTitle,
                cardUrl,
              },
            );
            log.info({ email, cardPublicId }, "Mention email sent");
          } else {
            log.debug(
              { cardPublicId },
              "Email disabled — mention email skipped",
            );
          }
        } catch (error) {
          log.error(
            { err: error, email, cardPublicId },
            "Failed to send mention email",
          );
        }
      }),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Error sending mention emails");
  }
}

export async function sendAssignmentPush(
  db: dbClient,
  {
    cardPublicId,
    actorUserId,
    actorName,
    workspaceMemberIds,
  }: {
    cardPublicId: string;
    actorUserId: string;
    actorName: string;
    workspaceMemberIds: number[];
  },
) {
  if (workspaceMemberIds.length === 0) return;
  try {
    const card = await cardRepo.getByPublicId(db, cardPublicId);
    const cardTitle = card?.title ?? "a card";

    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          inArray(workspaceMembers.id, workspaceMemberIds),
          isNotNull(workspaceMembers.userId),
        ),
      );
    const userIds = members
      .map((m) => m.userId)
      .filter((u): u is string => !!u && u !== actorUserId);

    if (userIds.length === 0) return;

    log.info(
      { cardPublicId, assigneeCount: userIds.length, actorUserId },
      "Sending assignment push",
    );

    await Promise.all(
      userIds.map((userId) =>
        sendPushToUser(
          db,
          userId,
          buildCardPushPayload(
            actorName,
            "assigned you to a card",
            cardTitle,
            cardPublicId,
          ),
        ),
      ),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to send assignment push");
  }
}

export async function sendUnassignmentPush(
  db: dbClient,
  {
    cardPublicId,
    actorUserId,
    actorName,
    workspaceMemberId,
  }: {
    cardPublicId: string;
    actorUserId: string;
    actorName: string;
    workspaceMemberId: number;
  },
) {
  try {
    const card = await cardRepo.getByPublicId(db, cardPublicId);
    const cardTitle = card?.title ?? "a card";

    const [member] = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.id, workspaceMemberId))
      .limit(1);

    const userId = member?.userId;
    if (!userId || userId === actorUserId) return;

    await sendPushToUser(
      db,
      userId,
      buildCardPushPayload(
        actorName,
        "removed you from a card",
        cardTitle,
        cardPublicId,
      ),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to send unassignment push");
  }
}

export async function sendCardMembersPush(
  db: dbClient,
  {
    cardId,
    cardPublicId,
    actorUserId,
    actorName,
    action,
  }: {
    cardId: number;
    cardPublicId: string;
    actorUserId: string;
    actorName: string;
    action: string;
  },
) {
  try {
    const card = await cardRepo.getByPublicId(db, cardPublicId);
    const cardTitle = card?.title ?? "a card";

    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(cardToWorkspaceMembers)
      .innerJoin(
        workspaceMembers,
        and(
          eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
          isNull(workspaceMembers.deletedAt),
        ),
      )
      .where(eq(cardToWorkspaceMembers.cardId, cardId));

    const userIds = members
      .map((m) => m.userId)
      .filter((u): u is string => !!u && u !== actorUserId);

    if (userIds.length === 0) return;

    log.info(
      { cardPublicId, memberCount: userIds.length, action, actorUserId },
      "Sending card members push",
    );

    await Promise.all(
      userIds.map((userId) =>
        sendPushToUser(
          db,
          userId,
          buildCardPushPayload(actorName, action, cardTitle, cardPublicId),
        ),
      ),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to send card members push");
  }
}
