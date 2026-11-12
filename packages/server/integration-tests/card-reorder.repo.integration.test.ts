import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import { boards, cards, lists } from "@kan/db/schema";

import { createTestDb, seedTestData } from "./test-db";

describe("card reorder", () => {
  it("moves a card within its list when only an index is given", async () => {
    const db = await createTestDb();
    const { user, workspace } = await seedTestData(db);

    const [board] = await db
      .insert(boards)
      .values({
        publicId: "board1234567",
        name: "Test board",
        slug: "test-board",
        createdBy: user.id,
        workspaceId: workspace.id,
      })
      .returning();
    const [list] = await db
      .insert(lists)
      .values({
        publicId: "list12345678",
        name: "Test list",
        index: 0,
        createdBy: user.id,
        boardId: board!.id,
      })
      .returning();
    const inserted = await db
      .insert(cards)
      .values(
        ["a", "b", "c"].map((title, index) => ({
          publicId: `card${title.repeat(8)}`,
          title,
          index,
          createdBy: user.id,
          listId: list!.id,
        })),
      )
      .returning();

    await cardRepo.reorder(db, {
      cardId: inserted[0]!.id,
      newIndex: 2,
      newListId: undefined,
    });

    const order = await db
      .select({ title: cards.title, index: cards.index })
      .from(cards)
      .where(eq(cards.listId, list!.id))
      .orderBy(asc(cards.index));
    expect(order).toEqual([
      { title: "b", index: 0 },
      { title: "c", index: 1 },
      { title: "a", index: 2 },
    ]);
  });
});
