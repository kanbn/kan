import { InternalServerErrorException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as permissions from "@kan/api/utils/permissions";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as labelRepo from "@kan/db/repository/label.repo";

import { LabelService } from "../label.service.js";

const label = {
  id: 1,
  workspaceId: 1,
  boardId: 1,
  boardType: "public" as const,
  boardVisibility: "workspace" as const,
};

let service: LabelService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);
  service = new LabelService();
});

describe("LabelService.byPublicId", () => {
  it("returns the label", async () => {
    vi.spyOn(
      labelRepo,
      "getWorkspaceAndLabelIdByLabelPublicId",
    ).mockResolvedValue(label as never);
    vi.spyOn(labelRepo, "getByPublicId").mockResolvedValue({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    } as never);

    const result = await service.byPublicId({
      labelPublicId: "label_12345",
      userId: "user_1",
    });

    expect(result).toEqual({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });
  });

  it("throws NOT_FOUND when the label doesn't exist", async () => {
    vi.spyOn(
      labelRepo,
      "getWorkspaceAndLabelIdByLabelPublicId",
    ).mockResolvedValue(null);

    await expect(
      service.byPublicId({ labelPublicId: "label_missing", userId: "user_1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("LabelService.create", () => {
  it("creates a label on the resolved board", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue({ id: 1, workspaceId: 1 } as never);
    vi.spyOn(labelRepo, "create").mockResolvedValue({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    } as never);

    const result = await service.create({
      name: "Bug",
      boardPublicId: "board_12345",
      colourCode: "#ff0000",
      userId: "user_1",
    });

    expect(result).toEqual({
      publicId: "label_12345",
      name: "Bug",
      colourCode: "#ff0000",
    });
  });

  it("throws when the insert produces no result", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue({ id: 1, workspaceId: 1 } as never);
    vi.spyOn(labelRepo, "create").mockResolvedValue(undefined);

    await expect(
      service.create({
        name: "Bug",
        boardPublicId: "board_12345",
        colourCode: "#ff0000",
        userId: "user_1",
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe("LabelService.update", () => {
  it("renames the label", async () => {
    vi.spyOn(
      labelRepo,
      "getWorkspaceAndLabelIdByLabelPublicId",
    ).mockResolvedValue(label as never);
    vi.spyOn(labelRepo, "update").mockResolvedValue({
      publicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
    } as never);

    const result = await service.update({
      labelPublicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
      userId: "user_1",
    });

    expect(result).toEqual({
      publicId: "label_12345",
      name: "Feature",
      colourCode: "#00ff00",
    });
  });
});

describe("LabelService.delete", () => {
  it("removes card relationships and soft deletes the label", async () => {
    vi.spyOn(
      labelRepo,
      "getWorkspaceAndLabelIdByLabelPublicId",
    ).mockResolvedValue(label as never);
    const hardDelete = vi
      .spyOn(cardRepo, "hardDeleteAllCardLabelRelationships")
      .mockResolvedValue(undefined as never);
    const softDelete = vi
      .spyOn(labelRepo, "softDelete")
      .mockResolvedValue({ id: 1 } as never);

    const result = await service.delete({
      labelPublicId: "label_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(hardDelete.mock.calls[0]?.[1]).toBe(1);
    expect(softDelete.mock.calls[0]?.[1]?.labelId).toBe(1);
    expect(softDelete.mock.calls[0]?.[1]?.deletedBy).toBe("user_1");
  });
});
