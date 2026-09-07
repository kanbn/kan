import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import { boards, cardActivities, cards, lists } from "@kan/db/schema";

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

  return { db, user, card: card! };
};

describe("card cover repository", () => {
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
});
