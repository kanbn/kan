import { and, count, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { cardActivities, cardAttachments, cards } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db
    .select({ count: count() })
    .from(cardAttachments)
    .where(isNull(cardAttachments.deletedAt));

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  attachmentInput: {
    cardId: number;
    filename: string;
    originalFilename: string;
    contentType: string;
    size: number;
    s3Key: string;
    createdBy: string;
  },
) => {
  const [result] = await db
    .insert(cardAttachments)
    .values({
      publicId: generateUID(),
      cardId: attachmentInput.cardId,
      filename: attachmentInput.filename,
      originalFilename: attachmentInput.originalFilename,
      contentType: attachmentInput.contentType,
      size: attachmentInput.size,
      s3Key: attachmentInput.s3Key,
      createdBy: attachmentInput.createdBy,
    })
    .returning({
      id: cardAttachments.id,
      publicId: cardAttachments.publicId,
      filename: cardAttachments.filename,
      originalFilename: cardAttachments.originalFilename,
      contentType: cardAttachments.contentType,
      size: cardAttachments.size,
      s3Key: cardAttachments.s3Key,
      createdBy: cardAttachments.createdBy,
      createdAt: cardAttachments.createdAt,
    });

  return result;
};

export const getByPublicId = (db: dbClient, publicId: string) => {
  return db.query.cardAttachments.findFirst({
    where: eq(cardAttachments.publicId, publicId),
    with: {
      card: {
        columns: {
          id: true,
          publicId: true,
        },
        with: {
          list: {
            columns: {
              id: true,
            },
            with: {
              board: {
                columns: {
                  id: true,
                  workspaceId: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const getAllByCardId = (db: dbClient, cardId: number) => {
  return db.query.cardAttachments.findMany({
    where: and(
      eq(cardAttachments.cardId, cardId),
      isNull(cardAttachments.deletedAt),
    ),
    orderBy: (attachments, { desc }) => [desc(attachments.createdAt)],
  });
};

export const softDeleteWithActivity = async (
  db: dbClient,
  args: {
    attachmentId: number;
    cardId: number;
    createdBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const [card] = await tx
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.id, args.cardId), isNull(cards.deletedAt)))
      .for("update");

    if (!card) return undefined;

    const [attachment] = await tx
      .select({
        id: cardAttachments.id,
        publicId: cardAttachments.publicId,
        originalFilename: cardAttachments.originalFilename,
        s3Key: cardAttachments.s3Key,
      })
      .from(cardAttachments)
      .where(
        and(
          eq(cardAttachments.id, args.attachmentId),
          eq(cardAttachments.cardId, card.id),
          isNull(cardAttachments.deletedAt),
        ),
      )
      .for("update");

    if (!attachment) return undefined;

    const deletedAt = new Date();
    const [clearedCover] = await tx
      .update(cards)
      .set({ coverAttachmentId: null, updatedAt: deletedAt })
      .where(
        and(eq(cards.id, card.id), eq(cards.coverAttachmentId, attachment.id)),
      )
      .returning({ id: cards.id });

    await tx
      .update(cardAttachments)
      .set({ deletedAt })
      .where(eq(cardAttachments.id, attachment.id));

    await tx.insert(cardActivities).values([
      {
        publicId: generateUID(),
        type: "card.updated.attachment.removed",
        cardId: card.id,
        attachmentId: attachment.id,
        fromTitle: attachment.originalFilename,
        createdBy: args.createdBy,
      },
      ...(clearedCover
        ? [
            {
              publicId: generateUID(),
              type: "card.updated.cover" as const,
              cardId: card.id,
              createdBy: args.createdBy,
            },
          ]
        : []),
    ]);

    return { ...attachment, coverCleared: Boolean(clearedCover) };
  });
};
