import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import {
  boards,
  cardActivities,
  cardAttachments,
  cards,
  lists,
} from "@kan/db/schema";

import { createTestDb, seedTestData } from "./test-db";

const seedCard = async () => {
  const db = await createTestDb();
  const { user, workspace } = await seedTestData(db);
  const [board] = await db
    .insert(boards)
    .values({
      publicId: "board1234567",
      name: "Cover board",
      slug: "cover-board",
      workspaceId: workspace.id,
      createdBy: user.id,
    })
    .returning();
  const [list] = await db
    .insert(lists)
    .values({
      publicId: "list12345678",
      name: "Todo",
      index: 0,
      boardId: board!.id,
      createdBy: user.id,
    })
    .returning();
  const [card] = await db
    .insert(cards)
    .values({
      publicId: "card12345678",
      title: "Covered card",
      index: 0,
      listId: list!.id,
      createdBy: user.id,
    })
    .returning();

  return { db, user, board: board!, list: list!, card: card! };
};

const seedAttachment = async (
  db: Awaited<ReturnType<typeof createTestDb>>,
  cardId: number,
  createdBy: string,
  suffix: string,
) => {
  const [attachment] = await db
    .insert(cardAttachments)
    .values({
      publicId: `attach${suffix}`.padEnd(12, "0").slice(0, 12),
      cardId,
      filename: `${suffix}.png`,
      originalFilename: `${suffix}.png`,
      contentType: "image/png",
      size: 1024,
      s3Key: `workspace/card/${suffix}.png`,
      createdBy,
    })
    .returning();

  return attachment!;
};

describe("card cover repository", () => {
  it("creates and selects an imported cover without synthetic activity", async () => {
    const { db, user, card } = await seedCard();
    await db
      .update(cards)
      .set({ coverColourCode: "#6cc3e0", coverSize: "full" })
      .where(eq(cards.id, card.id));

    const attachment = await cardAttachmentRepo.createImportedCover(db, {
      publicId: "importcover1",
      cardId: card.id,
      filename: "cover.png",
      originalFilename: "Imported cover.png",
      contentType: "image/png",
      size: 1024,
      s3Key: "workspace/card/imported-cover.png",
      createdBy: user.id,
    });

    const [updatedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    const activities = await db
      .select()
      .from(cardActivities)
      .where(eq(cardActivities.cardId, card.id));

    expect(updatedCard).toMatchObject({
      coverAttachmentId: attachment.id,
      coverColourCode: null,
      coverSize: "full",
    });
    expect(activities).toEqual([]);
  });

  it("rolls back an imported attachment when its card does not exist", async () => {
    const { db, user } = await seedCard();

    await expect(
      cardAttachmentRepo.createImportedCover(db, {
        publicId: "orphancover1",
        cardId: 999999,
        filename: "cover.png",
        originalFilename: "cover.png",
        contentType: "image/png",
        size: 1024,
        s3Key: "workspace/card/orphan-cover.png",
        createdBy: user.id,
      }),
    ).rejects.toThrow();

    const orphan = await db
      .select()
      .from(cardAttachments)
      .where(eq(cardAttachments.publicId, "orphancover1"));
    expect(orphan).toEqual([]);
  });

  it("applies the migration default and stores cover activity atomically", async () => {
    const { db, user, card } = await seedCard();

    expect(card.coverColourCode).toBeNull();
    expect(card.coverSize).toBe("normal");

    await cardRepo.updateCover(db, {
      cardPublicId: card.publicId,
      coverColourCode: "#6cc3e0",
      coverSize: "full",
      createdBy: user.id,
    });

    const [updatedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    const activities = await db
      .select()
      .from(cardActivities)
      .where(eq(cardActivities.cardId, card.id));

    expect(updatedCard).toMatchObject({
      coverColourCode: "#6cc3e0",
      coverSize: "full",
    });
    expect(activities).toEqual([
      expect.objectContaining({
        type: "card.updated.cover",
        createdBy: user.id,
      }),
    ]);
  });

  it("rolls back the cover update when activity creation fails", async () => {
    const { db, card } = await seedCard();

    await expect(
      cardRepo.updateCover(db, {
        cardPublicId: card.publicId,
        coverColourCode: "#6cc3e0",
        coverSize: "full",
        createdBy: crypto.randomUUID(),
      }),
    ).rejects.toThrow();

    const [unchangedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    expect(unchangedCard).toMatchObject({
      coverColourCode: null,
      coverSize: "normal",
    });
  });

  it("only selects a non-deleted attachment from the same card", async () => {
    const { db, user, board, list, card } = await seedCard();
    const attachment = await seedAttachment(db, card.id, user.id, "cover");

    const selected = await cardRepo.updateCover(db, {
      cardPublicId: card.publicId,
      coverColourCode: null,
      coverAttachmentPublicId: attachment.publicId,
      coverSize: "full",
      createdBy: user.id,
    });

    expect(selected).toMatchObject({
      coverAttachmentId: attachment.id,
      coverColourCode: null,
      coverSize: "full",
    });

    await expect(
      cardAttachmentRepo.getSelectedCoverAttachmentsByBoardPublicId(db, {
        boardPublicId: board.publicId,
        attachmentPublicIds: [attachment.publicId],
      }),
    ).resolves.toEqual([{ publicId: attachment.publicId }]);

    const [otherCard] = await db
      .insert(cards)
      .values({
        publicId: "othercard123",
        title: "Other card",
        index: 1,
        listId: list.id,
        createdBy: user.id,
      })
      .returning();

    await expect(
      cardRepo.updateCover(db, {
        cardPublicId: otherCard!.publicId,
        coverColourCode: null,
        coverAttachmentPublicId: attachment.publicId,
        coverSize: "normal",
        createdBy: user.id,
      }),
    ).resolves.toBeUndefined();

    await db
      .update(cardAttachments)
      .set({ deletedAt: new Date() })
      .where(eq(cardAttachments.id, attachment.id));

    await expect(
      cardAttachmentRepo.getSelectedCoverAttachmentsByBoardPublicId(db, {
        boardPublicId: board.publicId,
        attachmentPublicIds: [attachment.publicId],
      }),
    ).resolves.toEqual([]);

    await expect(
      cardRepo.updateCover(db, {
        cardPublicId: card.publicId,
        coverColourCode: null,
        coverAttachmentPublicId: attachment.publicId,
        coverSize: "normal",
        createdBy: user.id,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects colour and attachment cover sources at the database boundary", async () => {
    const { db, user, card } = await seedCard();
    const attachment = await seedAttachment(db, card.id, user.id, "check");

    await expect(
      db
        .update(cards)
        .set({
          coverColourCode: "#6cc3e0",
          coverAttachmentId: attachment.id,
        })
        .where(eq(cards.id, card.id)),
    ).rejects.toThrow();
  });

  it("clears the cover reference when an attachment is hard deleted", async () => {
    const { db, user, card } = await seedCard();
    const attachment = await seedAttachment(db, card.id, user.id, "foreignkey");
    await db
      .update(cards)
      .set({ coverAttachmentId: attachment.id })
      .where(eq(cards.id, card.id));

    await db
      .delete(cardAttachments)
      .where(eq(cardAttachments.id, attachment.id));

    const [updatedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    expect(updatedCard!.coverAttachmentId).toBeNull();
  });

  it("clears an active cover and records both events before deleting its object", async () => {
    const { db, user, card } = await seedCard();
    const attachment = await seedAttachment(db, card.id, user.id, "delete");
    await db
      .update(cards)
      .set({ coverAttachmentId: attachment.id })
      .where(eq(cards.id, card.id));

    const result = await cardAttachmentRepo.softDeleteWithActivity(db, {
      attachmentId: attachment.id,
      cardId: card.id,
      createdBy: user.id,
    });

    expect(result).toMatchObject({
      id: attachment.id,
      coverCleared: true,
    });

    const [updatedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    const [deletedAttachment] = await db
      .select()
      .from(cardAttachments)
      .where(eq(cardAttachments.id, attachment.id));
    const activities = await db
      .select()
      .from(cardActivities)
      .where(eq(cardActivities.cardId, card.id));

    expect(updatedCard!.coverAttachmentId).toBeNull();
    expect(deletedAttachment!.deletedAt).toBeInstanceOf(Date);
    expect(activities.map(({ type }) => type)).toEqual([
      "card.updated.attachment.removed",
      "card.updated.cover",
    ]);
  });

  it("keeps attachment deletion atomic when activity creation fails", async () => {
    const { db, user, card } = await seedCard();
    const attachment = await seedAttachment(db, card.id, user.id, "rollback");
    await db
      .update(cards)
      .set({ coverAttachmentId: attachment.id })
      .where(eq(cards.id, card.id));

    await expect(
      cardAttachmentRepo.softDeleteWithActivity(db, {
        attachmentId: attachment.id,
        cardId: card.id,
        createdBy: crypto.randomUUID(),
      }),
    ).rejects.toThrow();

    const [unchangedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, card.id));
    const [unchangedAttachment] = await db
      .select()
      .from(cardAttachments)
      .where(eq(cardAttachments.id, attachment.id));

    expect(unchangedCard!.coverAttachmentId).toBe(attachment.id);
    expect(unchangedAttachment!.deletedAt).toBeNull();
  });

  it("copies colour covers but not image-only presentation state", async () => {
    const { db, user, board } = await seedCard();

    const copiedBoard = await boardRepo.createFromSnapshot(db, {
      source: {
        name: "Source board",
        labels: [],
        lists: [
          {
            name: "Todo",
            index: 0,
            cards: [
              {
                title: "Colour cover",
                description: null,
                index: 0,
                coverColourCode: "#0d9488",
                coverSize: "full",
                labels: [],
              },
              {
                title: "Image cover",
                description: null,
                index: 1,
                coverColourCode: null,
                coverSize: "full",
                labels: [],
              },
            ],
          },
        ],
      },
      workspaceId: board.workspaceId,
      createdBy: user.id,
      slug: "copied-cover-board",
      type: "regular",
    });

    const copied = await db.query.boards.findFirst({
      where: eq(boards.publicId, copiedBoard.publicId),
      with: {
        lists: {
          with: { cards: true },
        },
      },
    });

    expect(copied?.lists[0]?.cards).toEqual([
      expect.objectContaining({
        title: "Colour cover",
        coverColourCode: "#0d9488",
        coverAttachmentId: null,
        coverSize: "full",
      }),
      expect.objectContaining({
        title: "Image cover",
        coverColourCode: null,
        coverAttachmentId: null,
        coverSize: "normal",
      }),
    ]);
  });
});
