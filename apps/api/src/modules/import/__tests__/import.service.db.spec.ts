import { and, asc, eq, inArray } from "drizzle-orm";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import {
  boards,
  cards,
  checklistItems,
  checklists,
  lists,
  users,
  workspaces,
} from "@kan/db/schema";
import * as permissions from "@kan/server/utils/permissions";
import * as trelloToken from "@kan/server/utils/trello-token";

import { db } from "../../../common/session.util.js";
import { ImportService } from "../import.service.js";

// Runs the import against the test database, with only Trello and auth stubbed.

const suffix = crypto.randomUUID().slice(0, 8);
let userId: string;
let workspaceId: number;
const workspacePublicId = `wsimp${suffix}`.slice(0, 12).padEnd(12, "0");

const must = <T>(value: T | undefined | null): T => {
  if (value == null) throw new Error("Expected a row");
  return value;
};

const checkItem = (id: string, name: string, pos: number, done = false) => ({
  id,
  name,
  pos,
  state: done ? "complete" : "incomplete",
});

const card = (id: string, idList: string, pos: number, extra = {}) => ({
  id,
  name: id,
  desc: "",
  idList,
  pos,
  labels: [],
  idChecklists: [],
  checkItemStates: [],
  ...extra,
});

const stubTrello = (boardsById: Record<string, unknown>) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const id = /\/boards\/([^?]+)/.exec(url)?.[1] ?? "";
      const body = boardsById[id];
      return Promise.resolve({
        ok: !!body,
        status: body ? 200 : 404,
        json: () => Promise.resolve(body),
      } as Response);
    }),
  );

const importBoards = (boardIds: string[]) =>
  new ImportService().importTrelloBoards({
    boardIds,
    workspacePublicId,
    userId,
  });

const boardNamed = (name: string) =>
  db.query.boards.findFirst({
    where: and(eq(boards.workspaceId, workspaceId), eq(boards.name, name)),
  });

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: "Importer",
      email: `importer-${suffix}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  userId = must(user).id;
  const [workspace] = await db
    .insert(workspaces)
    .values({
      publicId: workspacePublicId,
      name: "Import workspace",
      slug: `import-${suffix}`,
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();
  workspaceId = must(workspace).id;
});

beforeEach(() => {
  process.env.TRELLO_APP_API_KEY = "trello-key";
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(integrationsRepo, "getProviderForUser").mockResolvedValue({
    accessToken: "encrypted",
  } as never);
  vi.spyOn(trelloToken, "decryptTrelloToken").mockReturnValue("token");
  vi.spyOn(trelloToken, "isEncryptedTrelloToken").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Trello import (database)", () => {
  it("imports lists, cards, checklists, labels and due dates in Trello's order", async () => {
    const name = `Roadmap ${suffix}`;
    stubTrello({
      tb1: {
        id: "tb1",
        name,
        labels: [
          { id: "l1", name: "Bug", color: "red" },
          { id: "l2", name: "", color: "green_dark" },
          { id: "l3", name: "", color: null },
        ],
        lists: [
          { id: "done", name: "Done", pos: 2 },
          { id: "todo", name: "To do", pos: 1 },
        ],
        cards: [
          card("c1", "todo", 2, {
            due: "2026-12-01T09:00:00.000Z",
            labels: [{ id: "l1" }, { id: "l2" }],
          }),
          card("c2", "todo", 1),
          card("c3", "done", 1),
        ],
        // c2's checklist sorts between c1's two, which used to mismatch ids.
        checklists: [
          {
            id: "k1",
            idCard: "c1",
            name: "c1 second",
            pos: 3,
            checkItems: [
              checkItem("i1", "b", 2),
              checkItem("i2", "a", 1, true),
            ],
          },
          {
            id: "k2",
            idCard: "c2",
            name: "c2 only",
            pos: 2,
            checkItems: [checkItem("i3", "c2 item", 1)],
          },
          {
            id: "k3",
            idCard: "c1",
            name: "c1 first",
            pos: 1,
            checkItems: [checkItem("i4", "first item", 1)],
          },
        ],
      },
    });

    await expect(importBoards(["tb1"])).resolves.toEqual({
      boardsCreated: 1,
      failures: [],
    });

    const board = await boardNamed(name);
    const boardLists = await db.query.lists.findMany({
      where: eq(lists.boardId, must(board).id),
      orderBy: asc(lists.index),
      with: {
        cards: {
          orderBy: asc(cards.index),
          with: {
            labels: { with: { label: true } },
            checklists: {
              orderBy: asc(checklists.index),
              with: { items: { orderBy: asc(checklistItems.index) } },
            },
          },
        },
      },
    });

    expect(
      boardLists.map((list) => ({
        list: list.name,
        cards: list.cards.map((c) => ({
          title: c.title,
          due: c.dueDate?.toISOString() ?? null,
          labels: c.labels.map((l) => l.label.name).sort(),
          checklists: c.checklists.map((checklist) => ({
            name: checklist.name,
            items: checklist.items.map((i) => [i.title, i.completed]),
          })),
        })),
      })),
    ).toEqual([
      {
        list: "To do",
        cards: [
          {
            title: "c2",
            due: null,
            labels: [],
            checklists: [{ name: "c2 only", items: [["c2 item", false]] }],
          },
          {
            title: "c1",
            due: "2026-12-01T09:00:00.000Z",
            labels: ["Bug", "Green dark"],
            checklists: [
              { name: "c1 first", items: [["first item", false]] },
              {
                name: "c1 second",
                items: [
                  ["a", true],
                  ["b", false],
                ],
              },
            ],
          },
        ],
      },
      {
        list: "Done",
        cards: [{ title: "c3", due: null, labels: [], checklists: [] }],
      },
    ]);
  });

  it("imports a board too large for a single insert", async () => {
    const name = `Archive ${suffix}`;
    const bigCards = Array.from({ length: 1200 }, (_, i) =>
      card(`big${i}`, "archive", i),
    );
    stubTrello({
      tb2: {
        id: "tb2",
        name,
        labels: [],
        lists: [{ id: "archive", name: "Archive", pos: 1 }],
        cards: bigCards,
        checklists: [
          {
            id: "kbig",
            idCard: "big0",
            name: "Big",
            pos: 1,
            checkItems: Array.from({ length: 2500 }, (_, i) =>
              checkItem(`ib${i}`, `item ${i}`, i),
            ),
          },
        ],
      },
    });

    await expect(importBoards(["tb2"])).resolves.toMatchObject({
      boardsCreated: 1,
    });

    const board = await boardNamed(name);
    const [list] = await db.query.lists.findMany({
      where: eq(lists.boardId, must(board).id),
    });
    const importedCards = await db.query.cards.findMany({
      where: eq(cards.listId, must(list).id),
      columns: { id: true },
    });
    expect(importedCards).toHaveLength(1200);
    const [bigChecklist] = await db.query.checklists.findMany({
      where: inArray(
        checklists.cardId,
        importedCards.map((c) => c.id),
      ),
    });
    const items = await db.query.checklistItems.findMany({
      where: eq(checklistItems.checklistId, must(bigChecklist).id),
    });
    expect(items).toHaveLength(2500);
  });

  it("trims text longer than its column instead of failing the board", async () => {
    const long = (prefix: string, length: number) =>
      prefix + "x".repeat(length - prefix.length);
    const name = long(`Long ${suffix} `, 300);
    // The emoji straddles the 500 limit, so a UTF-16 slice would split it.
    const item = `${"y".repeat(499)}😀${"z".repeat(100)}`;
    stubTrello({
      tb3: {
        id: "tb3",
        name,
        labels: [{ id: "l1", name: long("label", 300), color: "red" }],
        lists: [{ id: "list", name: long("list", 300), pos: 1 }],
        cards: [
          card("c1", "list", 1, {
            name: long("card", 2500),
            labels: [{ id: "l1" }],
          }),
        ],
        checklists: [
          {
            id: "k1",
            idCard: "c1",
            name: long("checklist", 300),
            pos: 1,
            checkItems: [checkItem("i1", item, 1)],
          },
        ],
      },
    });

    await expect(importBoards(["tb3"])).resolves.toEqual({
      boardsCreated: 1,
      failures: [],
    });

    const board = must(await boardNamed(name.slice(0, 255)));
    const [list] = await db.query.lists.findMany({
      where: eq(lists.boardId, board.id),
      with: {
        cards: {
          with: {
            labels: { with: { label: true } },
            checklists: { with: { items: true } },
          },
        },
      },
    });
    const importedCard = must(must(list).cards[0]);
    const checklist = must(importedCard.checklists[0]);

    expect({
      list: must(list).name.length,
      card: importedCard.title.length,
      label: must(importedCard.labels[0]).label.name.length,
      checklist: checklist.name.length,
    }).toEqual({ list: 255, card: 2000, label: 255, checklist: 255 });
    expect(must(checklist.items[0]).title).toBe(`${"y".repeat(499)}😀`);
  });

  it("leaves nothing behind when a board fails partway, and imports the others", async () => {
    const failing = `Half ${suffix}`;
    const fine = `Fine ${suffix}`;
    const trelloBoard = (id: string, boardName: string) => ({
      id,
      name: boardName,
      labels: [{ id: `${id}l`, name: "Bug", color: "red" }],
      lists: [{ id: `${id}list`, name: "List", pos: 1 }],
      cards: [card(`${id}c`, `${id}list`, 1)],
      checklists: [
        {
          id: `${id}k`,
          idCard: `${id}c`,
          name: "Steps",
          pos: 1,
          checkItems: [checkItem(`${id}i`, "step", 1)],
        },
      ],
    });
    stubTrello({
      half: trelloBoard("half", failing),
      fine: trelloBoard("fine", fine),
    });
    const realBulkCreateItems = checklistRepo.bulkCreateItems;
    vi.spyOn(checklistRepo, "bulkCreateItems").mockImplementation(
      async (tx, items) => {
        const [checklist] = await tx
          .select({ name: boards.name })
          .from(checklists)
          .innerJoin(cards, eq(cards.id, checklists.cardId))
          .innerJoin(lists, eq(lists.id, cards.listId))
          .innerJoin(boards, eq(boards.id, lists.boardId))
          .where(eq(checklists.id, must(items[0]).checklistId));
        if (checklist?.name === failing) throw new Error("insert failed");
        return realBulkCreateItems(tx, items);
      },
    );

    await expect(importBoards(["half", "fine", "missing"])).resolves.toEqual({
      boardsCreated: 1,
      failures: [
        { boardId: "half", boardName: failing, code: "unknown" },
        { boardId: "missing", boardName: null, code: "not_found" },
      ],
    });

    expect(await boardNamed(failing)).toBeUndefined();
    expect(await boardNamed(fine)).toBeDefined();
  });
});
