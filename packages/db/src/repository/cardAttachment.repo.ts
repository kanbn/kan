import { and, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { cardAttachments } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

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

export const softDelete = async (
  db: dbClient,
  args: {
    attachmentId: number;
    deletedAt: Date;
  },
) => {
  const [result] = await db
    .update(cardAttachments)
    .set({ deletedAt: args.deletedAt })
    .where(eq(cardAttachments.id, args.attachmentId))
    .returning({ id: cardAttachments.id });

  return result;
};
