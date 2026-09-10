import { and, count, eq, inArray, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import {
  boards,
  cardActivities,
  cardAttachments,
  cards,
  lists,
  workspaces,
} from "@kan/db/schema";
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

export const createImportedCover = async (
  db: dbClient,
  input: {
    publicId: string;
    cardId: number;
    filename: string;
    originalFilename: string;
    contentType: string;
    size: number;
    s3Key: string;
    createdBy: string;
  },
) =>
  db.transaction(async (tx) => {
    const [attachment] = await tx
      .insert(cardAttachments)
      .values(input)
      .returning({
        id: cardAttachments.id,
        publicId: cardAttachments.publicId,
      });

    if (!attachment) throw new Error("Failed to create imported attachment");

    const [card] = await tx
      .update(cards)
      .set({
        coverAttachmentId: attachment.id,
        coverColourCode: null,
      })
      .where(and(eq(cards.id, input.cardId), isNull(cards.deletedAt)))
      .returning({ id: cards.id });

    if (!card) throw new Error("Imported cover card was not found");

    return attachment;
  });

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

export const getCoverCandidateByPublicId = async (
  db: dbClient,
  publicId: string,
) => {
  const [result] = await db
    .select({
      id: cardAttachments.id,
      publicId: cardAttachments.publicId,
      cardId: cardAttachments.cardId,
      contentType: cardAttachments.contentType,
      s3Key: cardAttachments.s3Key,
      deletedAt: cardAttachments.deletedAt,
    })
    .from(cardAttachments)
    .where(eq(cardAttachments.publicId, publicId));

  return result;
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

export const updateContentType = async (
  db: dbClient,
  args: { attachmentId: number; contentType: string },
) => {
  const [result] = await db
    .update(cardAttachments)
    .set({ contentType: args.contentType })
    .where(
      and(
        eq(cardAttachments.id, args.attachmentId),
        isNull(cardAttachments.deletedAt),
      ),
    )
    .returning({ id: cardAttachments.id });

  return result;
};

export const getSelectedCoverAttachmentsByBoardPublicId = async (
  db: dbClient,
  args: { boardPublicId: string; attachmentPublicIds: string[] },
) => {
  if (args.attachmentPublicIds.length === 0) return [];

  return db
    .select({
      publicId: cardAttachments.publicId,
    })
    .from(cardAttachments)
    .innerJoin(cards, eq(cards.coverAttachmentId, cardAttachments.id))
    .innerJoin(lists, eq(lists.id, cards.listId))
    .innerJoin(boards, eq(boards.id, lists.boardId))
    .innerJoin(workspaces, eq(workspaces.id, boards.workspaceId))
    .where(
      and(
        eq(boards.publicId, args.boardPublicId),
        isNull(boards.deletedAt),
        isNull(workspaces.deletedAt),
        isNull(lists.deletedAt),
        isNull(cards.deletedAt),
        isNull(cardAttachments.deletedAt),
        inArray(cardAttachments.publicId, args.attachmentPublicIds),
      ),
    );
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
