import { ForbiddenException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as encryption from "@kan/server/utils/encryption";
import * as permissions from "@kan/server/utils/permissions";
import * as trelloToken from "@kan/server/utils/trello-token";

import { clip, ImportService } from "../import.service.js";

const workspace = { id: 1, publicId: "workspace_12345" };

const trelloBoard = {
  id: "tb1",
  name: "Roadmap",
  labels: [
    { id: "l1", name: "Bug", color: "red" },
    { id: "l2", name: "", color: "blue" },
  ],
  lists: [{ id: "list1", name: "To do" }],
  cards: [
    {
      id: "c1",
      name: "Fix login",
      desc: "",
      idList: "list1",
      labels: [{ id: "l1", name: "Bug" }],
      idChecklists: ["cl1"],
      checkItemStates: [],
    },
  ],
  checklists: [
    {
      id: "cl1",
      idCard: "c1",
      name: "Steps",
      checkItems: [
        { id: "i2", name: "Second", state: "incomplete", pos: 2 },
        { id: "i1", name: "First", state: "complete", pos: 1 },
      ],
    },
  ],
};

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as Response;

let service: ImportService;
const originalKey = process.env.TRELLO_APP_API_KEY;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.TRELLO_APP_API_KEY = "trello-key";
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
    workspace as never,
  );
  vi.spyOn(integrationsRepo, "getProviderForUser").mockResolvedValue({
    accessToken: "encrypted",
  } as never);
  vi.spyOn(trelloToken, "decryptTrelloToken").mockReturnValue("trello-token");
  vi.spyOn(trelloToken, "isEncryptedTrelloToken").mockReturnValue(true);
  vi.spyOn(encryption, "decryptToken").mockReturnValue("github-token");
  vi.spyOn(importRepo, "create").mockResolvedValue({ id: 50 });
  vi.spyOn(importRepo, "update").mockResolvedValue(undefined);
  service = new ImportService();
});

afterEach(() => {
  process.env.TRELLO_APP_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

describe("ImportService.importTrelloBoards", () => {
  beforeEach(() => {
    vi.spyOn(boardRepo, "create").mockResolvedValue({ id: 10 } as never);
    vi.spyOn(labelRepo, "bulkCreate").mockResolvedValue([
      { id: 20 },
      { id: 21 },
    ] as never);
    vi.spyOn(listRepo, "create").mockResolvedValue({ id: 30 } as never);
    vi.spyOn(cardRepo, "bulkCreate").mockImplementation((_db, batch) =>
      Promise.resolve(
        batch.map((card, index) => ({
          id: 40 + index,
          publicId: card.publicId,
        })),
      ),
    );
    vi.spyOn(cardActivityRepo, "bulkCreate").mockResolvedValue(
      undefined as never,
    );
    vi.spyOn(checklistRepo, "bulkCreate").mockImplementation((_db, batch) =>
      Promise.resolve(
        batch.map((_, index) => ({ id: 60 + index, publicId: `cl${index}` })),
      ),
    );
    vi.spyOn(checklistRepo, "bulkCreateItems").mockResolvedValue(
      undefined as never,
    );
    vi.spyOn(cardRepo, "bulkCreateCardLabelRelationships").mockResolvedValue(
      undefined as never,
    );
  });

  it("maps a Trello board into board, labels, cards, checklists and label links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(trelloBoard)),
    );

    const result = await service.importTrelloBoards({
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ boardsCreated: 1, failures: [] });
    expect(
      vi.mocked(labelRepo.bulkCreate).mock.calls[0]?.[1].map((l) => l.name),
    ).toEqual(["Bug", "Blue"]);
    expect(cardActivityRepo.bulkCreate).toHaveBeenCalledWith(
      expect.anything(),
      [{ type: "card.created", cardId: 40, createdBy: "user_1" }],
    );
    const items = vi.mocked(checklistRepo.bulkCreateItems).mock.calls[0]?.[1];
    expect(items?.map((i) => [i.title, i.index])).toEqual([
      ["First", 1],
      ["Second", 2],
    ]);
    expect(cardRepo.bulkCreateCardLabelRelationships).toHaveBeenCalledWith(
      expect.anything(),
      [{ cardId: 40, labelId: 20 }],
    );
    expect(importRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      { status: "success" },
      { importId: 50 },
    );
  });

  it("counts only the boards that imported when some Trello fetches fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(trelloBoard))
        .mockResolvedValueOnce(jsonResponse({}, false, 404)),
    );

    const result = await service.importTrelloBoards({
      boardIds: ["tb1", "missing"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({
      boardsCreated: 1,
      failures: [
        {
          boardId: "missing",
          boardName: null,
          code: "not_found",
        },
      ],
    });
  });

  it("imports due dates and keeps cards in Trello's order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...trelloBoard,
          cards: [
            { ...trelloBoard.cards[0], id: "c2", name: "Second", pos: 2 },
            {
              ...trelloBoard.cards[0],
              name: "First",
              pos: 1,
              due: "2026-12-01T09:00:00.000Z",
            },
          ],
        }),
      ),
    );

    await service.importTrelloBoards({
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    const cards = vi.mocked(cardRepo.bulkCreate).mock.calls[0]?.[1];
    expect(cards?.map((c) => [c.title, c.dueDate])).toEqual([
      ["First", new Date("2026-12-01T09:00:00.000Z")],
      ["Second", null],
    ]);
  });

  it("inserts large boards in batches", async () => {
    const checkItems = Array.from({ length: 2500 }, (_, i) => ({
      id: `i${i}`,
      name: `Item ${i}`,
      state: "incomplete",
      pos: i,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...trelloBoard,
          checklists: [{ ...trelloBoard.checklists[0], checkItems }],
        }),
      ),
    );

    await service.importTrelloBoards({
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    const batches = vi
      .mocked(checklistRepo.bulkCreateItems)
      .mock.calls.map((call) => call[1].length);
    expect(batches).toEqual([1000, 1000, 500]);
  });

  it("keeps a checklist's items in order when they span two batches", async () => {
    const checkItems = Array.from({ length: 1500 }, (_, i) => ({
      id: `i${i}`,
      name: `Item ${i}`,
      state: "incomplete",
      pos: 1500 - i,
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...trelloBoard,
          checklists: [{ ...trelloBoard.checklists[0], checkItems }],
        }),
      ),
    );

    await service.importTrelloBoards({
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    const indexes = vi
      .mocked(checklistRepo.bulkCreateItems)
      .mock.calls.flatMap((call) => call[1].map((item) => item.index));
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it("reports a failed board without leaking the database error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(trelloBoard)),
    );
    vi.spyOn(checklistRepo, "bulkCreateItems").mockRejectedValue(
      new Error("syntax error at or near AND"),
    );

    await expect(
      service.importTrelloBoards({
        boardIds: ["tb1"],
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).resolves.toEqual({
      boardsCreated: 0,
      failures: [{ boardId: "tb1", boardName: "Roadmap", code: "unknown" }],
    });
  });

  it("shortens a long board name in the failure it reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ...trelloBoard, name: "R".repeat(5000) }),
        ),
    );
    vi.spyOn(checklistRepo, "bulkCreateItems").mockRejectedValue(
      new Error("insert failed"),
    );

    const { failures } = await service.importTrelloBoards({
      boardIds: ["tb1"],
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(failures[0]?.boardName).toBe(`${"R".repeat(60)}…`);
  });

  it("marks the import failed when no boards import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({}, false, 403)),
    );

    await expect(
      service.importTrelloBoards({
        boardIds: ["tb1"],
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).resolves.toEqual({
      boardsCreated: 0,
      failures: [{ boardId: "tb1", boardName: null, code: "no_access" }],
    });
    expect(importRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      { status: "failed" },
      { importId: 50 },
    );
  });

  it("throws UNAUTHORIZED when the user has not connected Trello", async () => {
    vi.spyOn(integrationsRepo, "getProviderForUser").mockResolvedValue(
      undefined,
    );

    await expect(
      service.importTrelloBoards({
        boardIds: ["tb1"],
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("ImportService board:create authorization", () => {
  it.each(["trello", "github"] as const)(
    "%s import requires board:create, not just membership",
    async (source) => {
      vi.spyOn(permissions, "assertPermission").mockRejectedValue(
        new ForbiddenException(),
      );
      const create = vi.spyOn(boardRepo, "create");

      const call =
        source === "trello"
          ? service.importTrelloBoards({
              boardIds: ["tb1"],
              workspacePublicId: "workspace_12345",
              userId: "guest_1",
            })
          : service.importGitHubProjects({
              projectIds: ["PVT_1"],
              workspacePublicId: "workspace_12345",
              userId: "guest_1",
            });

      await expect(call).rejects.toMatchObject({ status: 403 });
      expect(permissions.assertPermission).toHaveBeenCalledWith(
        expect.anything(),
        "guest_1",
        1,
        "board:create",
      );
      expect(create).not.toHaveBeenCalled();
    },
  );
});

describe("clip", () => {
  it("leaves short text alone and never splits an emoji", () => {
    expect(clip("short", 10)).toBe("short");
    expect(clip("abc😀def", 4)).toBe("abc😀");
    expect(clip("😀".repeat(600), 500)).toBe("😀".repeat(500));
  });
});

describe("ImportService.importGitHubProjects", () => {
  it("trims long names and still files items under a long status", async () => {
    const longStatus = "s".repeat(300);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            node: {
              title: "P".repeat(300),
              field: {
                options: [
                  { id: "o1", name: "Todo" },
                  { id: "o2", name: longStatus },
                ],
              },
              areaField: {
                options: [{ id: "a1", name: "a".repeat(300), color: "RED" }],
              },
              items: {
                nodes: [
                  {
                    fieldValueByName: { name: longStatus },
                    content: { title: "t".repeat(2500), body: "" },
                  },
                ],
              },
            },
          },
        }),
      ),
    );
    const createBoard = vi
      .spyOn(boardRepo, "create")
      .mockResolvedValue({ id: 10 } as never);
    const createLabels = vi
      .spyOn(labelRepo, "bulkCreate")
      .mockResolvedValue([{ id: 20 }] as never);
    const createLists = vi
      .spyOn(listRepo, "bulkCreate")
      .mockResolvedValue([{ id: 30 }, { id: 31 }] as never);
    const createCards = vi
      .spyOn(cardRepo, "bulkCreate")
      .mockResolvedValue([{ id: 40 }] as never);
    vi.spyOn(cardActivityRepo, "bulkCreate").mockResolvedValue(
      undefined as never,
    );

    await expect(
      service.importGitHubProjects({
        projectIds: ["PVT_1"],
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).resolves.toEqual({ projectsImported: 1 });

    const board = createBoard.mock.calls[0]?.[1];
    expect(board?.name).toHaveLength(255);
    expect(board?.slug).toHaveLength(255);
    expect(createLabels.mock.calls[0]?.[1][0]?.name).toHaveLength(255);
    expect(
      createLists.mock.calls[0]?.[1].map((list) => list.name.length),
    ).toEqual([4, 255]);
    const [cardInput] = createCards.mock.calls[0]?.[1] ?? [];
    expect(cardInput?.title).toHaveLength(2000);
    expect(cardInput?.listId).toBe(31);
  });
});

describe("ImportService.getGitHubProjects", () => {
  it("merges user and organisation projects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            viewer: {
              projectsV2: { nodes: [{ id: "p1", title: "Mine" }] },
              organizations: {
                nodes: [
                  { projectsV2: { nodes: [{ id: "p2", title: "Org" }] } },
                ],
              },
            },
          },
        }),
      ),
    );

    expect(await service.getGitHubProjects({ userId: "user_1" })).toEqual([
      { id: "p1", name: "Mine" },
      { id: "p2", name: "Org" },
    ]);
  });

  it("throws on GraphQL errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ errors: [{ message: "x" }] })),
    );

    await expect(
      service.getGitHubProjects({ userId: "user_1" }),
    ).rejects.toMatchObject({ status: 500 });
  });
});
