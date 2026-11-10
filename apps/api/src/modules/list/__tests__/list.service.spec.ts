import { InternalServerErrorException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as permissions from "@kan/api/utils/permissions";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as listRepo from "@kan/db/repository/list.repo";

import { ListService } from "../list.service.js";

const list = {
  id: 1,
  publicId: "list_12345",
  name: "To do",
  createdBy: "user_1",
  workspaceId: 1,
  boardId: 1,
  boardType: "public" as const,
  boardPublicId: "board_12345",
};

let service: ListService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanDelete").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanEdit").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);
  service = new ListService();
});

describe("ListService.create", () => {
  it("creates a list on the resolved board", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue({ id: 1, workspaceId: 1 } as never);
    vi.spyOn(listRepo, "create").mockResolvedValue({
      publicId: "list_12345",
      name: "To do",
    } as never);

    const result = await service.create({
      name: "To do",
      boardPublicId: "board_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ publicId: "list_12345", name: "To do" });
  });

  it("throws NOT_FOUND when the board doesn't exist", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue(undefined);

    await expect(
      service.create({
        name: "To do",
        boardPublicId: "board_missing",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("ListService.delete", () => {
  it("soft deletes the list and its cards", async () => {
    vi.spyOn(
      listRepo,
      "getWorkspaceAndListIdByListPublicId",
    ).mockResolvedValue(list as never);
    vi.spyOn(listRepo, "softDeleteById").mockResolvedValue({ id: 1 } as never);
    vi.spyOn(cardRepo, "softDeleteAllByListIds").mockResolvedValue([
      { id: 1 },
    ] as never);
    const bulkCreate = vi
      .spyOn(activityRepo, "bulkCreate")
      .mockResolvedValue(undefined as never);

    const result = await service.delete({
      listPublicId: "list_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(bulkCreate).toHaveBeenCalled();
    // toHaveBeenCalledWith/toEqual on this spy's args crashes vitest (OOM) here — check shallowly.
    const activities = bulkCreate.mock.calls[0]?.[1] as
      | { type: string; createdBy: string; cardId: number }[]
      | undefined;
    expect(activities?.[0]?.type).toBe("card.archived");
    expect(activities?.[0]?.cardId).toBe(1);
  });

  it("throws NOT_FOUND when the list doesn't exist", async () => {
    vi.spyOn(
      listRepo,
      "getWorkspaceAndListIdByListPublicId",
    ).mockResolvedValue(undefined as never);

    await expect(
      service.delete({ listPublicId: "list_missing", userId: "user_1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("ListService.update", () => {
  it("renames the list", async () => {
    vi.spyOn(
      listRepo,
      "getWorkspaceAndListIdByListPublicId",
    ).mockResolvedValue(list as never);
    vi.spyOn(listRepo, "update").mockResolvedValue({
      publicId: "list_12345",
      name: "Doing",
    } as never);

    const result = await service.update({
      listPublicId: "list_12345",
      userId: "user_1",
      name: "Doing",
    });

    expect(result).toEqual({ publicId: "list_12345", name: "Doing" });
  });

  it("reorders the list when an index is given", async () => {
    vi.spyOn(
      listRepo,
      "getWorkspaceAndListIdByListPublicId",
    ).mockResolvedValue(list as never);
    vi.spyOn(listRepo, "reorder").mockResolvedValue({
      publicId: "list_12345",
      name: "To do",
    } as never);

    const result = await service.update({
      listPublicId: "list_12345",
      userId: "user_1",
      index: 2,
    });

    expect(result).toEqual({ publicId: "list_12345", name: "To do" });
  });

  it("throws when neither update produces a result", async () => {
    vi.spyOn(
      listRepo,
      "getWorkspaceAndListIdByListPublicId",
    ).mockResolvedValue(list as never);

    await expect(
      service.update({ listPublicId: "list_12345", userId: "user_1" }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
