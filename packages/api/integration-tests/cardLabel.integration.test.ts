import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import { CardLabelBoardError } from "@kan/db/repository/card.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as schema from "@kan/db/schema";

import { createTestDb, seedTestData, type TestDbClient } from "./test-db";

/**
 * Labels are board-scoped (labels.boardId), but the _card_labels join table
 * carries only (cardId, labelId), so nothing in the schema prevents a card on
 * one board being linked to a label from another. These tests pin the
 * invariant that the writers must enforce instead.
 */
describe("card label board scoping", () => {
  let db: TestDbClient;
  let user: { id: string; name: string | null };
  let workspace: { id: number; publicId: string };

  // Two boards in the SAME workspace: the permission checks are all
  // workspace-scoped, so a same-workspace pair is the reachable case.
  let listOnBoardA: { id: number };
  let listOnBoardB: { id: number };
  let labelOnBoardA: { id: number };
  let labelOnBoardB: { id: number };
  let cardOnBoardB: { id: number };
  let boardAId: number;
  let boardBId: number;

  const makeBoard = async (publicId: string, name: string, slug: string) => {
    const [board] = await db
      .insert(schema.boards)
      .values({
        publicId,
        name,
        slug,
        workspaceId: workspace.id,
        createdBy: user.id,
      })
      .returning();
    return board!;
  };

  beforeEach(async () => {
    db = await createTestDb();
    const seeded = await seedTestData(db);
    user = seeded.user;
    workspace = seeded.workspace;

    const boardA = await makeBoard("bdaaaa123456", "Board A", "board-a");
    const boardB = await makeBoard("bdbbbb123456", "Board B", "board-b");
    boardAId = boardA.id;
    boardBId = boardB.id;

    const [la] = await db
      .insert(schema.lists)
      .values({
        publicId: "ltaaaa123456",
        name: "List A",
        index: 0,
        boardId: boardA.id,
        createdBy: user.id,
      })
      .returning();
    listOnBoardA = la!;

    const [lb] = await db
      .insert(schema.lists)
      .values({
        publicId: "ltbbbb123456",
        name: "List B",
        index: 0,
        boardId: boardB.id,
        createdBy: user.id,
      })
      .returning();
    listOnBoardB = lb!;

    const [labA] = await db
      .insert(schema.labels)
      .values({
        publicId: "lbaaaa123456",
        name: "Urgent (board A)",
        boardId: boardA.id,
        createdBy: user.id,
      })
      .returning();
    labelOnBoardA = labA!;

    const [labB] = await db
      .insert(schema.labels)
      .values({
        publicId: "lbbbbb123456",
        name: "Urgent (board B)",
        boardId: boardB.id,
        createdBy: user.id,
      })
      .returning();
    labelOnBoardB = labB!;

    const [card] = await db
      .insert(schema.cards)
      .values({
        publicId: "cdbbbb123456",
        title: "A card on board B",
        index: 0,
        listId: listOnBoardB.id,
        createdBy: user.id,
      })
      .returning();
    cardOnBoardB = card!;
  });

  describe("createCardLabelRelationship", () => {
    it("links a label that belongs to the card's own board", async () => {
      const result = await cardRepo.createCardLabelRelationship(db, {
        cardId: cardOnBoardB.id,
        labelId: labelOnBoardB.id,
      });

      expect(result).toBeDefined();
    });

    it("refuses a label from a different board", async () => {
      await expect(
        cardRepo.createCardLabelRelationship(db, {
          cardId: cardOnBoardB.id,
          labelId: labelOnBoardA.id,
        }),
      ).rejects.toThrow(CardLabelBoardError);
    });

    it("leaves no row behind when it refuses", async () => {
      await cardRepo
        .createCardLabelRelationship(db, {
          cardId: cardOnBoardB.id,
          labelId: labelOnBoardA.id,
        })
        .catch(() => undefined);

      const existing = await cardRepo.getCardLabelRelationship(db, {
        cardId: cardOnBoardB.id,
        labelId: labelOnBoardA.id,
      });

      expect(existing).toBeUndefined();
    });
  });

  describe("bulkCreateCardLabelRelationships", () => {
    it("links labels from the card's own board", async () => {
      const result = await cardRepo.bulkCreateCardLabelRelationships(db, [
        { cardId: cardOnBoardB.id, labelId: labelOnBoardB.id },
      ]);

      expect(result).toHaveLength(1);
    });

    it("refuses a batch containing a label from another board", async () => {
      await expect(
        cardRepo.bulkCreateCardLabelRelationships(db, [
          { cardId: cardOnBoardB.id, labelId: labelOnBoardA.id },
        ]),
      ).rejects.toThrow(CardLabelBoardError);
    });

    it("refuses the whole batch rather than writing the valid half", async () => {
      // A partial write would leave the card holding one correct label and
      // silently dropping another, which is harder to notice than a failure.
      await cardRepo
        .bulkCreateCardLabelRelationships(db, [
          { cardId: cardOnBoardB.id, labelId: labelOnBoardB.id },
          { cardId: cardOnBoardB.id, labelId: labelOnBoardA.id },
        ])
        .catch(() => undefined);

      const good = await cardRepo.getCardLabelRelationship(db, {
        cardId: cardOnBoardB.id,
        labelId: labelOnBoardB.id,
      });

      expect(good).toBeUndefined();
    });
  });

  describe("bulkCreateCardLabelRelationship (used by the importer)", () => {
    it("links labels created alongside the card on the same board", async () => {
      // The Trello/GitHub importer creates a board, its labels and its cards
      // together, so its links are always same-board. This pins that the guard
      // does not break import.
      const result = await cardRepo.bulkCreateCardLabelRelationship(db, [
        { cardId: cardOnBoardB.id, labelId: labelOnBoardB.id },
      ]);

      expect(result).toBeDefined();
    });

    it("refuses a label from another board", async () => {
      await expect(
        cardRepo.bulkCreateCardLabelRelationship(db, [
          { cardId: cardOnBoardB.id, labelId: labelOnBoardA.id },
        ]),
      ).rejects.toThrow(CardLabelBoardError);
    });
  });

  describe("labelRepo.create with a cardId (the fourth writer)", () => {
    it("links a new label to a card on the same board", async () => {
      const result = await labelRepo.create(db, {
        name: "New label",
        colourCode: "#ff0000",
        createdBy: user.id,
        boardId: boardBId,
        cardId: cardOnBoardB.id,
      });

      expect(result).toBeDefined();
    });

    it("refuses to link a label created on another board", async () => {
      await expect(
        labelRepo.create(db, {
          name: "Board A label on a board B card",
          colourCode: "#00ff00",
          createdBy: user.id,
          boardId: boardAId,
          cardId: cardOnBoardB.id,
        }),
      ).rejects.toThrow(CardLabelBoardError);
    });

    it("leaves no orphaned label behind when it refuses", async () => {
      // The label is created before the link, so without a transaction a
      // rejected link would strand it on the board.
      await labelRepo
        .create(db, {
          name: "Should not survive",
          colourCode: "#0000ff",
          createdBy: user.id,
          boardId: boardAId,
          cardId: cardOnBoardB.id,
        })
        .catch(() => undefined);

      const stranded = await db.query.labels.findMany({
        columns: { id: true },
        where: eq(schema.labels.name, "Should not survive"),
      });

      expect(stranded).toHaveLength(0);
    });
  });

  it("uses two genuinely different boards, so the refusals mean something", () => {
    // The earlier version of this compared the two LIST ids, which differ even
    // when both lists sit on one board. Compare the boards themselves.
    expect(boardAId).not.toBe(boardBId);
    expect(listOnBoardA.id).not.toBe(listOnBoardB.id);
  });
});
