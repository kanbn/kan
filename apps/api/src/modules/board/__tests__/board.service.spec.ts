import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as avatarUrls from "@kan/server/utils/avatarUrls";
import * as permissions from "@kan/server/utils/permissions";

import { BoardService } from "../board.service.js";

const board = {
  id: 2,
  workspaceId: 1,
  createdBy: "user_1",
  type: "regular",
  visibility: "private",
  deletedAt: null,
};

const card = (dueDate: Date | null) => ({
  publicId: "card_1",
  title: "Card",
  dueDate,
  members: [],
  summary: undefined,
});

let service: BoardService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanEdit").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanDelete").mockResolvedValue(undefined);
  vi.spyOn(
    boardRepo,
    "getWorkspaceAndBoardIdByBoardPublicId",
  ).mockResolvedValue(board as never);
  vi.spyOn(avatarUrls, "createAvatarUrlResolver").mockReturnValue(
    vi.fn() as never,
  );
  service = new BoardService();
});

describe("BoardService.byId", () => {
  it("checks access, offers only board-assignable members and returns ISO due dates", async () => {
    const members = [{ publicId: "m1", user: null }];
    vi.spyOn(boardRepo, "getByPublicId").mockResolvedValue({
      workspace: { publicId: "ws", members },
      lists: [
        { publicId: "l1", cards: [card(new Date("2026-02-01T00:00:00.000Z"))] },
      ],
    } as never);
    const filter = vi
      .spyOn(permissions, "filterBoardAssignable")
      .mockResolvedValue([] as never);

    const result = await service.byId({
      boardPublicId: "board_123456",
      cardView: "full",
      userId: "user_1",
    });

    expect(permissions.assertBoardAccess).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      board,
    );
    expect(filter).toHaveBeenCalledWith(expect.anything(), board, members);
    expect(result.workspace.members).toEqual([]);
    expect(result.lists[0]?.cards[0]?.dueDate).toBe("2026-02-01T00:00:00.000Z");
  });

  it("throws NOT_FOUND for an unknown board", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue(undefined);

    await expect(
      service.byId({
        boardPublicId: "missing_1234",
        cardView: "full",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("BoardService.bySlug", () => {
  beforeEach(() => {
    vi.spyOn(workspaceRepo, "getBySlugWithBoards").mockResolvedValue({
      id: 1,
    } as never);
  });

  it("returns 404 instead of null when the public board does not exist", async () => {
    vi.spyOn(boardRepo, "getBySlug").mockResolvedValue(null);

    await expect(
      service.bySlug({ workspaceSlug: "acme", boardSlug: "roadmap" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns ISO due dates", async () => {
    vi.spyOn(boardRepo, "getBySlug").mockResolvedValue({
      lists: [{ cards: [card(null)] }],
    } as never);

    const result = await service.bySlug({
      workspaceSlug: "acme",
      boardSlug: "roadmap",
    });

    expect(result.lists[0]?.cards[0]?.dueDate).toBeNull();
  });
});

describe("BoardService.create", () => {
  beforeEach(() => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue({
      id: 1,
      publicId: "workspace_12345",
    } as never);
    vi.spyOn(boardRepo, "isSlugUnique").mockResolvedValue(true);
  });

  it("creates lists and labels for a new board, requiring board:create", async () => {
    vi.spyOn(boardRepo, "create").mockResolvedValue({
      id: 9,
      publicId: "board_new",
      name: "Roadmap",
    });
    const lists = vi
      .spyOn(listRepo, "bulkCreate")
      .mockResolvedValue([] as never);
    const labels = vi
      .spyOn(labelRepo, "bulkCreate")
      .mockResolvedValue([] as never);

    await service.create({
      name: "Roadmap",
      workspacePublicId: "workspace_12345",
      lists: ["To do", "Done"],
      labels: ["Bug"],
      userId: "user_1",
    });

    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "board:create",
    );
    expect(lists.mock.calls[0]?.[1].map((l) => l.name)).toEqual([
      "To do",
      "Done",
    ]);
    expect(labels.mock.calls[0]?.[1][0]).toMatchObject({ name: "Bug" });
  });

  it("refuses to copy a source board from another workspace", async () => {
    vi.spyOn(boardRepo, "getByPublicId").mockResolvedValue({
      workspace: { publicId: "workspace_other" },
    } as never);
    vi.spyOn(workspaceRepo, "getByPublicId").mockImplementation(((
      _db: unknown,
      publicId: string,
    ) =>
      Promise.resolve({
        id: publicId === "workspace_other" ? 99 : 1,
      })) as never);
    const snapshot = vi.spyOn(boardRepo, "createFromSnapshot");

    await expect(
      service.create({
        name: "Copy",
        workspacePublicId: "workspace_12345",
        lists: [],
        labels: [],
        sourceBoardPublicId: "board_source1",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(permissions.assertBoardAccess).toHaveBeenCalled();
    expect(snapshot).not.toHaveBeenCalled();
  });
});

describe("BoardService.update", () => {
  it("handles a favourite-only update without touching the board", async () => {
    const favourite = vi
      .spyOn(boardRepo, "addUserFavorite")
      .mockResolvedValue(undefined as never);
    const update = vi.spyOn(boardRepo, "update");

    const result = await service.update({
      boardPublicId: "board_123456",
      favorite: true,
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(favourite).toHaveBeenCalledWith(expect.anything(), "user_1", 2);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a slug that is already taken", async () => {
    vi.spyOn(boardRepo, "isBoardSlugAvailable").mockResolvedValue(false);

    await expect(
      service.update({
        boardPublicId: "board_123456",
        slug: "taken",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("BoardService.delete", () => {
  it("soft deletes the board, its lists and cards, and logs card archive activity", async () => {
    vi.spyOn(boardRepo, "getWithListIdsByPublicId").mockResolvedValue({
      ...board,
      lists: [{ id: 5 }],
    } as never);
    vi.spyOn(boardRepo, "softDelete").mockResolvedValue(undefined);
    vi.spyOn(listRepo, "softDeleteAllByBoardId").mockResolvedValue([] as never);
    vi.spyOn(cardRepo, "softDeleteAllByListIds").mockResolvedValue([
      { id: 7 },
    ] as never);
    const activities = vi
      .spyOn(activityRepo, "bulkCreate")
      .mockResolvedValue(undefined as never);

    expect(
      await service.delete({ boardPublicId: "board_123456", userId: "user_1" }),
    ).toEqual({ success: true });
    expect(activities).toHaveBeenCalledWith(expect.anything(), [
      { type: "card.archived", createdBy: "user_1", cardId: 7 },
    ]);
  });
});

describe("BoardService.move", () => {
  const movable = {
    ...board,
    slug: "roadmap",
    name: "Roadmap",
    isArchived: false,
  };

  it.each([
    [{ ...movable, type: "template" }, 400],
    [{ ...movable, isArchived: true }, 400],
  ])("rejects moving %o", async (source, status) => {
    vi.spyOn(boardRepo, "getBoardForMove").mockResolvedValue(source as never);

    await expect(
      service.move({
        boardPublicId: "board_123456",
        targetWorkspacePublicId: "workspace_target",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status });
  });

  it("rejects a deleted target workspace", async () => {
    vi.spyOn(boardRepo, "getBoardForMove").mockResolvedValue(movable as never);
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue({
      id: 3,
      deletedAt: new Date(),
    } as never);

    await expect(
      service.move({
        boardPublicId: "board_123456",
        targetWorkspacePublicId: "workspace_target",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("requires board:create in the target workspace before moving", async () => {
    vi.spyOn(boardRepo, "getBoardForMove").mockResolvedValue(movable as never);
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue({
      id: 3,
      deletedAt: null,
    } as never);
    vi.spyOn(permissions, "assertPermission").mockRejectedValue(
      new ForbiddenException(),
    );
    const moveRepo = vi.spyOn(boardRepo, "moveToWorkspace");

    await expect(
      service.move({
        boardPublicId: "board_123456",
        targetWorkspacePublicId: "workspace_target",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      3,
      "board:create",
    );
    expect(moveRepo).not.toHaveBeenCalled();
  });
});
