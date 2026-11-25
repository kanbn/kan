import { asc, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { boards, cards, lists } from "@kan/db/schema";

import type { TestDbClient } from "./test-db";
import { createTestDb, seedTestData } from "./test-db";

describe("card archive", () => {
  let db: TestDbClient;
  let userId: string;
  let workspaceId: number;
  let boardId: number;
  let listIds: number[];
  let cardIds: number[];

  beforeAll(async () => {
    db = await createTestDb();
    const { user, workspace } = await seedTestData(db);
    userId = user.id;
    workspaceId = workspace.id;
  });

  beforeEach(async () => {
    await db.delete(boards);
    const [board] = await db
      .insert(boards)
      .values({
        publicId: "board1234567",
        name: "Board",
        slug: "board",
        visibility: "public",
        createdBy: userId,
        workspaceId,
      })
      .returning();
    boardId = board!.id;
    listIds = (
      await db
        .insert(lists)
        .values(
          [0, 1].map((index) => ({
            publicId: `list1234567${index}`,
            name: `List ${index}`,
            index,
            createdBy: userId,
            boardId,
          })),
        )
        .returning()
    ).map((list) => list.id);
    cardIds = (
      await db
        .insert(cards)
        .values(
          ["a", "b", "c"].map((title, index) => ({
            publicId: `card${title.repeat(8)}`,
            title,
            index,
            createdBy: userId,
            listId: listIds[1]!,
          })),
        )
        .returning()
    ).map((card) => card.id);
  });

  const archive = (position: number, archivedAt = new Date()) =>
    cardRepo.archive(db, {
      cardId: cardIds[position]!,
      archivedAt,
      archivedBy: userId,
    });

  const unarchive = (position: number) =>
    cardRepo.unarchive(db, {
      cardId: cardIds[position]!,
      boardId,
      listPublicId: "list12345671",
    });

  const onBoard = async () => {
    const board = await boardRepo.getByPublicId(db, "board1234567", userId, {
      members: [],
      labels: [],
      lists: [],
      dueDate: [],
      type: undefined,
    });
    return board!.lists.map((list) =>
      list.cards.map((card) => `${card.title}${card.index}`),
    );
  };

  const archived = async (args = {}) => {
    const page = await cardRepo.getArchivedByBoardId(db, boardId, {
      limit: 50,
      ...args,
    });
    return page.cards.map((card) => card.title);
  };

  it("takes the card off the board and closes the gap", async () => {
    expect(await archive(0)).toBe(true);

    expect(await onBoard()).toEqual([[], ["b0", "c1"]]);
    expect(await archived()).toEqual(["a"]);

    const results = await workspaceRepo.searchBoardsAndCards(
      db,
      workspaceId,
      "a",
    );
    expect(results.filter((result) => result.type === "card")).toEqual([]);

    const publicBoard = await boardRepo.getBySlug(db, "board", workspaceId, {
      members: [],
      labels: [],
      lists: [],
      dueDate: [],
    });
    expect(
      publicBoard!.lists.flatMap((list) => list.cards.map((c) => c.title)),
    ).toEqual(["b", "c"]);
  });

  it("does nothing the second time", async () => {
    await archive(0);

    expect(await archive(0)).toBe(false);
    expect(await onBoard()).toEqual([[], ["b0", "c1"]]);
  });

  it("leaves the archived card out of later ordering", async () => {
    await archive(1);
    await cardRepo.reorder(db, {
      cardId: cardIds[2]!,
      newIndex: 0,
      newListId: undefined,
    });
    await cardRepo.create(db, {
      title: "d",
      description: null,
      createdBy: userId,
      listId: listIds[1]!,
      workspaceId,
      position: "end",
    });

    expect(await onBoard()).toEqual([[], ["c0", "a1", "d2"]]);
  });

  it("restores to the end of its list", async () => {
    await archive(0);

    expect(await unarchive(0)).toMatchObject({ publicId: "list12345671" });
    expect(await unarchive(0)).toBeNull();
    expect(await onBoard()).toEqual([[], ["b0", "c1", "a2"]]);
    expect(await archived()).toEqual([]);
  });

  it("survives its list being deleted and restores to the first list", async () => {
    await archive(0);
    const args = { deletedAt: new Date(), deletedBy: userId };
    await listRepo.softDeleteById(db, { listId: listIds[1]!, ...args });
    const deleted = await cardRepo.softDeleteAllByListIds(db, {
      listIds: [listIds[1]!],
      keepArchived: true,
      ...args,
    });

    expect(deleted).toHaveLength(2);
    expect(await archived()).toEqual(["a"]);
    expect(await unarchive(0)).toMatchObject({ publicId: "list12345670" });
    expect(await onBoard()).toEqual([["a0"]]);
  });

  it("can't be restored to a board with no lists", async () => {
    await archive(0);
    await listRepo.softDeleteAllByBoardId(db, {
      boardId,
      deletedAt: new Date(),
      deletedBy: userId,
    });

    expect(await unarchive(0)).toBeNull();
    expect(await archived()).toEqual(["a"]);
  });

  it("deletes an archived card without moving the others", async () => {
    await archive(0);
    await cardRepo.softDelete(db, {
      cardId: cardIds[0]!,
      deletedAt: new Date(),
      deletedBy: userId,
    });

    expect(await archived()).toEqual([]);
    expect(await onBoard()).toEqual([[], ["b0", "c1"]]);
  });

  it("can be deleted along with its board", async () => {
    await archive(0);
    await cardRepo.softDeleteAllByListIds(db, {
      listIds,
      deletedAt: new Date(),
      deletedBy: userId,
    });

    const remaining = await db
      .select({ deletedAt: cards.deletedAt })
      .from(cards)
      .where(eq(cards.listId, listIds[1]!))
      .orderBy(asc(cards.id));
    expect(remaining.every((card) => card.deletedAt)).toBe(true);
  });

  it("lists newest first, pages past ties and searches titles", async () => {
    const at = new Date("2026-01-01T00:00:00.000Z");
    await archive(0, at);
    await archive(1, at);
    await archive(2, new Date("2026-01-02T00:00:00.000Z"));

    expect(await archived()).toEqual(["c", "b", "a"]);

    const first = await cardRepo.getArchivedByBoardId(db, boardId, {
      limit: 2,
    });
    expect(first.hasMore).toBe(true);
    const last = first.cards[1]!;
    expect(
      await archived({
        cursor: { archivedAt: last.archivedAt, publicId: last.publicId },
      }),
    ).toEqual(["a"]);
    expect(await archived({ search: "B" })).toEqual(["b"]);
  });
});
