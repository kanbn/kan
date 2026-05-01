import { env } from "next-runtime-env";

import type { dbClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

const log = createLogger("notifications");
import * as cardRepo from "@kan/db/repository/card.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as notificationRepo from "@kan/db/repository/notification.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { sendEmail } from "@kan/email";
import { parseMentionsFromHTML } from "@kan/shared/utils";

import { publishNotificationEventToWebsocket } from "../events";

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
          const notification = await notificationRepo.create(db, {
            type: "mention",
            userId,
            cardId,
            commentId,
          });

          if (notification) {
            void publishNotificationEventToWebsocket(userId, {
              scope: "notification",
              type: "notification.created",
              notificationPublicId: notification.publicId,
            });
          }

          // Send email
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
 * Sends in-app notifications to all members assigned to a card, excluding the
 * actor who triggered the event (to avoid self-notifications).
 */
export async function notifyCardMembers({
  db,
  cardId,
  cardPublicId,
  actorUserId,
  type,
}: {
  db: dbClient;
  cardId: number;
  cardPublicId: string;
  actorUserId: string;
  type: "card.member.assigned" | "card.comment.added" | "card.updated";
}) {
  try {
    const card = await cardRepo.getWithListAndMembersByPublicId(db, cardPublicId);
    if (!card) return;

    const members = card.members
      .map((m) => m.user?.id)
      .filter((id): id is string => !!id && id !== actorUserId);

    if (members.length === 0) return;

    await Promise.all(
      members.map(async (userId) => {
        try {
          const notification = await notificationRepo.create(db, {
            type,
            userId,
            cardId,
          });

          if (notification) {
            void publishNotificationEventToWebsocket(userId, {
              scope: "notification",
              type: "notification.created",
              notificationPublicId: notification.publicId,
            });
          }
        } catch (error) {
          log.error({ err: error, userId, cardPublicId, type }, "Failed to create card member notification");
        }
      }),
    );
  } catch (error) {
    log.error({ err: error, cardPublicId }, "Error notifying card members");
  }
}

/**
 * Sends an assignment notification to a specific user for a card.
 */
export async function notifyMemberAssigned({
  db,
  cardId,
  cardPublicId,
  assignedUserId,
  actorUserId,
}: {
  db: dbClient;
  cardId: number;
  cardPublicId: string;
  assignedUserId: string;
  actorUserId: string;
}) {
  // Don't notify users who assigned themselves
  if (assignedUserId === actorUserId) return;

  try {
    const notification = await notificationRepo.create(db, {
      type: "card.member.assigned",
      userId: assignedUserId,
      cardId,
    });

    if (notification) {
      void publishNotificationEventToWebsocket(assignedUserId, {
        scope: "notification",
        type: "notification.created",
        notificationPublicId: notification.publicId,
      });
    }
  } catch (error) {
    log.error({ err: error, assignedUserId, cardPublicId }, "Failed to send assignment notification");
  }
}

