import { env } from "next-runtime-env";

import type { dbClient } from "@kan/db/client";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { sendEmail } from "@kan/email";

/**
 * Extract mentioned workspace member publicIds from comment HTML.
 * Mention spans look like:
 * <span data-type="mention" data-id="memberPublicId" data-label="Name">@Name</span>
 */
export function extractMentionedMemberIds(commentHtml: string): string[] {
  const mentionRegex = /data-type="mention"\s+data-id="([^"]+)"/g;
  const ids: string[] = [];
  let match;
  while ((match = mentionRegex.exec(commentHtml)) !== null) {
    if (match[1]) {
      ids.push(match[1]);
    }
  }
  return [...new Set(ids)];
}

/**
 * Strip HTML tags from a string to get plain text for email preview.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Send mention notification emails to mentioned workspace members.
 * This is a fire-and-forget operation that never throws.
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
    if (env("NEXT_PUBLIC_DISABLE_EMAIL")?.toLowerCase() === "true") {
      return;
    }

    const mentionedIds = extractMentionedMemberIds(commentHtml);
    if (mentionedIds.length === 0) return;

    const mentionedMembers =
      await workspaceRepo.getMembersWithEmailsByPublicIds(db, mentionedIds);

    if (!mentionedMembers.length) return;

    const cardContext = await cardRepo.getCardNotificationContext(
      db,
      cardPublicId,
    );

    if (!cardContext) return;

    const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
    const boardPublicId = cardContext.list.board.publicId;
    const cardUrl = `${baseUrl}/boards/${boardPublicId}?cardId=${cardContext.publicId}`;

    const commentPreview = stripHtml(commentHtml).slice(0, 200);

    // Get commenter info for the email
    const commenter = await db.query.users.findFirst({
      where: (users: any, { eq }: any) => eq(users.id, commenterUserId),
    });

    const commenterName =
      commenter?.name ?? commenter?.email ?? "Someone";

    for (const member of mentionedMembers) {
      const memberUserId = member.user?.id ?? member.userId;
      if (memberUserId === commenterUserId) continue;

      const recipientEmail = member.user?.email ?? member.email;
      if (!recipientEmail) continue;

      await sendEmail(
        recipientEmail,
        `${commenterName} mentioned you in ${cardContext.title}`,
        "MENTION_NOTIFICATION",
        {
          name: commenterName,
          cardTitle: cardContext.title,
          workspaceName: cardContext.list.board.workspace.name,
          commentPreview: commentPreview,
          cardUrl: cardUrl,
        },
      );
    }
  } catch (error) {
    console.error("Failed to send mention emails:", error);
  }
}
