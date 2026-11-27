import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as boardLabelRepo from "@kan/db/repository/boardLabel.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as permissions from "@kan/server/utils/permissions";

import { BoardLabelService } from "../board-label.service.js";

let service: BoardLabelService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue({
    id: 1,
  } as never);
  vi.spyOn(boardLabelRepo, "getByPublicId").mockResolvedValue({
    id: 3,
    workspaceId: 1,
  });
  service = new BoardLabelService();
});

describe("BoardLabelService", () => {
  it("creates a label in the workspace", async () => {
    const create = vi.spyOn(boardLabelRepo, "create").mockResolvedValue({
      publicId: "blabel_12345",
      name: "Client",
      colourCode: "#0d9488",
    });

    await service.create({
      workspacePublicId: "ws_123456789",
      name: "Client",
      colourCode: "#0d9488",
      userId: "user_1",
    });

    expect(permissions.assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      "board:edit",
    );
    expect(create).toHaveBeenCalledWith(expect.anything(), {
      name: "Client",
      colourCode: "#0d9488",
      workspaceId: 1,
      createdBy: "user_1",
    });
  });

  it("checks permission against the label's workspace before deleting", async () => {
    vi.spyOn(permissions, "assertPermission").mockRejectedValue(
      new ForbiddenException(),
    );
    const softDelete = vi.spyOn(boardLabelRepo, "softDelete");

    await expect(
      service.delete({ boardLabelPublicId: "blabel_12345", userId: "user_2" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(softDelete).not.toHaveBeenCalled();
  });

  it("404s for a missing label", async () => {
    vi.spyOn(boardLabelRepo, "getByPublicId").mockResolvedValue(undefined);

    await expect(
      service.update({
        boardLabelPublicId: "missing_1234",
        name: "x",
        colourCode: "#000000",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
