import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as encryption from "@kan/api/utils/encryption";
import * as permissions from "@kan/api/utils/permissions";
import * as trelloToken from "@kan/api/utils/trello-token";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { ImportService } from "../import.service.js";

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
  vi.spyOn(importRepo, "create").mockResolvedValue({ id: 50 } as never);
  vi.spyOn(importRepo, "update").mockResolvedValue(undefined as never);
  service = new ImportService();
});

afterEach(() => {
  process.env.TRELLO_APP_API_KEY = originalKey;
  vi.unstubAllGlobals();
});

describe("ImportService.importTrelloBoards", () => {
  beforeEach(() => {
    vi.spyOn(boardRepo, "create").mockResolvedValue({ id: 10 } as never);
    vi.spyOn(labelRepo, "bulkCreate").mockResolvedValue([{ id: 20 }] as never);
    vi.spyOn(listRepo, "create").mockResolvedValue({ id: 30 } as never);
    vi.spyOn(cardRepo, "bulkCreate").mockResolvedValue([{ id: 40 }] as never);
    vi.spyOn(cardActivityRepo, "bulkCreate").mockResolvedValue(
      undefined as never,
    );
    vi.spyOn(checklistRepo, "bulkCreate").mockResolvedValue([
      { id: 60 },
    ] as never);
    vi.spyOn(checklistRepo, "bulkCreateItems").mockResolvedValue(
      undefined as never,
    );
    vi.spyOn(cardRepo, "bulkCreateCardLabelRelationship").mockResolvedValue(
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

    expect(result).toEqual({ boardsCreated: 1 });
    // unnamed Trello labels are dropped
    expect(vi.mocked(labelRepo.bulkCreate).mock.calls[0]?.[1]).toHaveLength(1);
    expect(cardActivityRepo.bulkCreate).toHaveBeenCalledWith(
      expect.anything(),
      [{ type: "card.created", cardId: 40, createdBy: "user_1" }],
    );
    const items = vi.mocked(checklistRepo.bulkCreateItems).mock.calls[0]?.[1];
    expect(items?.map((i) => i.title)).toEqual(["First", "Second"]);
    expect(cardRepo.bulkCreateCardLabelRelationship).toHaveBeenCalledWith(
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

    expect(result).toEqual({ boardsCreated: 1 });
  });

  it("marks the import failed and throws when no boards import", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({}, false, 500)),
    );

    await expect(
      service.importTrelloBoards({
        boardIds: ["tb1"],
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
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
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("ImportService board:create authorization", () => {
  it.each(["trello", "github"] as const)(
    "%s import requires board:create, not just membership",
    async (source) => {
      vi.spyOn(permissions, "assertPermission").mockRejectedValue(
        new TRPCError({ code: "FORBIDDEN" }),
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

      await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
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
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
