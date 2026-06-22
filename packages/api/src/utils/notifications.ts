import { and, eq, inArray, isNull, isNotNull } from "drizzle-orm";
import { env } from "next-runtime-env";

import type { dbClient } from "@banana/db/client";
import {
  cardToWorkspaceMembers,
  workspaceMembers,
} from "@banana/db/schema";
import { createLogger } from "@banana/logger";

const log = createLogger("notifications");
import * as cardRepo from "@banana/db/repository/card.repo";
import * as memberRepo from "@banana/db/repository/member.repo";
import * as notificationRepo from "@banana/db/repository/notification.repo";
import * as userRepo from "@banana/db/repository/user.repo";
import * as workspaceRepo from "@banana/db/repository/workspace.repo";
import { sendEmail } from "@banana/email";
import { parseMentionsFromHTML } from "@banana/shared/utils";
import { sendPushToUser } from "./push";

/**
 * Sends mention notification emails to mentioned members
 * Only sends emails for new mentions (checks notification table to avoid duplicates)
 */
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
    // Parse mentions from HTML
    const mentionPublicIds = parseMentionsFromHTML(commentHtml);
    if (mentionPublicIds.length === 0) return;

    // Get card with board information
    const card = await cardRepo.getWithListAndMembersByPublicId(db, cardPublicId);
    if (!card?.list.board) return;

    const board = card.list.board;
    const boardName = board.name;
    const cardTitle = card.title;
    const cardId = card.id;

    // Get workspace ID from workspace publicId
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

    // Get mentioned members with full details (filtered by workspace)
    const membersWithDetails = await memberRepo.getByPublicIdsWithUsers(
      db,
      mentionPublicIds,
      workspaceId,
    );

    // Filter out the commenter
    const membersToNotify = membersWithDetails.filter(
      (member) => member.user?.id !== commenterUserId,
    );

    if (membersToNotify.length === 0) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL");
    const cardUrl = `${baseUrl}/cards/${cardPublicId}`;

    // Global email kill-switch. When set (e.g. local dev without SMTP),
    // mention emails are skipped entirely — but the in-app notification record
    // and the web push below still fire.
    const emailEnabled =
      env("NEXT_PUBLIC_DISABLE_EMAIL")?.toLowerCase() !== "true";

    log.info({ cardPublicId, mentionCount: membersToNotify.length, commenterUserId }, "Sending mention emails");
    // Send emails to all mentioned members (only if notification doesn't exist)
    await Promise.all(
      membersToNotify.map(async (member) => {
        const userId = member.user?.id;
        const email = member.user?.email ?? member.email;

        // Skip pending members (no userId) - they can be mentioned but won't receive emails
        if (!userId || !email) return;

        try {
          // Check if notification already exists for this mention
          const notificationExists = await notificationRepo.exists(db, {
            userId,
            cardId,
            type: "mention",
          });

          // If notification already exists, skip sending email
          if (notificationExists) {
            log.debug({ email, cardPublicId }, "Skipping duplicate mention email");
            return;
          }

          // Create notification record
          await notificationRepo.create(db, {
            type: "mention",
            userId,
            cardId,
            commentId,
          });

          // Send a push notification to any subscribed device. Runs before the
          // email so a failed email send (e.g. SMTP not configured locally)
          // can't block the push. No-ops gracefully if the user has none.
          await sendPushToUser(db, userId, {
            title: `${commenterName} mentioned you`,
            body: cardTitle,
            // Relative path, not an absolute URL: the SW resolves it against the
            // PWA's own origin (localhost on desktop, the tunnel/domain on
            // mobile), so the deep-link works on every device.
            url: `/cards/${cardPublicId}`,
          });

          // Send email (skipped when NEXT_PUBLIC_DISABLE_EMAIL is set).
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
            log.debug({ cardPublicId }, "Email disabled — mention email skipped");
          }
        } catch (error) {
          log.error({ err: error, email, cardPublicId }, "Failed to send mention email");
        }
      }),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Error sending mention emails");
  }
}

/**
 * Sends a push notification to the members assigned to a card.
 *
 * Resolves workspace member ids → user ids internally, so callers only need the
 * member ids they already have. The actor is excluded (you don't get notified
 * for assigning yourself). `sendPushToUser` no-ops gracefully for users with no
 * subscription. Fetches the card title for the notification body.
 */
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
        sendPushToUser(db, userId, {
          title: `${actorName} assigned you to a card`,
          body: cardTitle,
          url: `/cards/${cardPublicId}`,
        }),
      ),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to send assignment push");
  }
}

/**
 * Sends a push notification to a member removed from a card.
 * Counterpart to `sendAssignmentPush`. Takes the single workspace member id
 * (the only thing the unassign path has), resolves it to a user, and pushes.
 * Excludes the actor. No-ops gracefully if the user has no subscription.
 */
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

    await sendPushToUser(db, userId, {
      title: `${actorName} removed you from a card`,
      body: cardTitle,
      url: `/cards/${cardPublicId}`,
    });
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to send unassignment push");
  }
}

/**
 * Pushes a notification to all CURRENT members of a card — i.e. members who are
 * still assigned. Removed members are hard-deleted from the relationship table
 * (so they're naturally excluded) and soft-deleted workspace members are
 * filtered out via `deletedAt IS NULL`. The actor is excluded.
 *
 * Generic across update types: pass an `action` like "updated the description".
 * Independent of @mentions (those go through `sendMentionEmails`), so a member
 * is notified about the description change even when no one is @mentioned.
 */
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
        sendPushToUser(db, userId, {
          title: `${actorName} ${action}`,
          body: cardTitle,
          url: `/cards/${cardPublicId}`,
        }),
      ),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Failed to send card members push");
  }
}

