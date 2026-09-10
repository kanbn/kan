import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";

import { deleteBoardBackgroundObjects } from "../utils/boardBackgroundPreview";
import { assertCanEdit } from "../utils/permissions";
import { boardRouter } from "./board";

vi.mock("@kan/db/repository/board.repo", () => ({
  getWorkspaceAndBoardIdByBoardPublicId: vi.fn(),
  update: vi.fn(),
  addUserFavorite: vi.fn(),
  removeUserFavorite: vi.fn(),
}));

vi.mock("@kan/db/repository/workspace.repo", () => ({}));
vi.mock("@kan/db/repository/card.repo", () => ({}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({}));
vi.mock("@kan/db/repository/label.repo", () => ({}));
vi.mock("@kan/db/repository/list.repo", () => ({}));

vi.mock("../utils/permissions", () => ({
  assertCanEdit: vi.fn(),
  assertCanDelete: vi.fn(),
  assertPermission: vi.fn(),
}));

vi.mock("@kan/shared/utils", () => ({
  convertDueDateFiltersToRanges: vi.fn(),
  generateSlug: vi.fn(),
  generateUID: vi.fn(),
}));

vi.mock("@kan/shared/constants", () => ({ colours: [] }));
vi.mock("../utils/boardBackgroundPreview", () => ({
  deleteBoardBackgroundObjects: vi.fn(() => Promise.resolve([])),
}));

const getBoard = vi.mocked(boardRepo.getWorkspaceAndBoardIdByBoardPublicId);
const updateBoard = vi.mocked(boardRepo.update);
const assertBoardCanEdit = vi.mocked(assertCanEdit);
const deleteBackgroundObjects = vi.mocked(deleteBoardBackgroundObjects);

describe("board background updates", () => {
  const db = {} as never;
  const user = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  };
  const board = {
    id: 1,
    workspaceId: 2,
    createdBy: "user-123",
    backgroundImageKey: null,
  };
  const boardPublicId = "board1234567";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "attachments");
    getBoard.mockResolvedValue(board);
    assertBoardCanEdit.mockResolvedValue(undefined);
    updateBoard.mockResolvedValue({ publicId: boardPublicId, name: "Board" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets an arbitrary valid colour through the existing board update", async () => {
    await boardRouter.createCaller({ db, user } as never).update({
      boardPublicId,
      background: { kind: "colour", colourCode: "#4BCE97" },
    });

    expect(assertBoardCanEdit).toHaveBeenCalledWith(
      db,
      user.id,
      board.workspaceId,
      "board:edit",
      board.createdBy,
    );
    expect(updateBoard).toHaveBeenCalledWith(db, {
      boardPublicId,
      name: undefined,
      slug: undefined,
      visibility: undefined,
      isArchived: undefined,
      background: { kind: "colour", colourCode: "#4BCE97" },
    });
  });

  it("clears the current background", async () => {
    await boardRouter.createCaller({ db, user } as never).update({
      boardPublicId,
      background: null,
    });

    expect(updateBoard).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ background: null }),
    );
  });

  it("removes image objects only after replacing the stored background", async () => {
    const imageKey = "workspace/board-backgrounds/board1234567/image.jpg";
    getBoard.mockResolvedValue({ ...board, backgroundImageKey: imageKey });

    await boardRouter.createCaller({ db, user } as never).update({
      boardPublicId,
      background: { kind: "colour", colourCode: "#0d9488" },
    });

    expect(updateBoard).toHaveBeenCalled();
    expect(deleteBackgroundObjects).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId,
      s3Key: imageKey,
    });
  });

  it("rejects malformed imported colour values", async () => {
    await expect(
      boardRouter.createCaller({ db, user } as never).update({
        boardPublicId,
        background: { kind: "colour", colourCode: "green" },
      }),
    ).rejects.toThrow();

    expect(updateBoard).not.toHaveBeenCalled();
  });

  it("does not update a background without board edit permission", async () => {
    assertBoardCanEdit.mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "No permission" }),
    );

    await expect(
      boardRouter.createCaller({ db, user } as never).update({
        boardPublicId,
        background: { kind: "colour", colourCode: "#0d9488" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(updateBoard).not.toHaveBeenCalled();
  });
});
