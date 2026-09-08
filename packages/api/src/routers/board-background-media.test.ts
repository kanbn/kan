import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateDownloadUrl, generateUploadUrl } from "@kan/shared/utils";

import type * as BoardBackgroundPreviewModule from "../utils/boardBackgroundPreview";
import {
  BoardBackgroundPreviewError,
  deleteBoardBackgroundObjects,
  ensureBoardBackgroundPreviews,
  inspectBoardBackgroundObject,
} from "../utils/boardBackgroundPreview";
import { assertCanEdit, assertPermission } from "../utils/permissions";
import { boardBackgroundRouter } from "./boardBackground";

vi.mock("@kan/db/repository/board.repo", () => ({
  getWorkspaceAndBoardIdByBoardPublicId: vi.fn(),
  getBackgroundsByPublicIds: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getById: vi.fn(),
}));

vi.mock("@kan/shared/utils", () => ({
  generateUID: vi.fn(() => "upload123456"),
  generateUploadUrl: vi.fn(() => Promise.resolve("https://upload.example")),
  generateDownloadUrl: vi.fn((_bucket: string, key: string) =>
    Promise.resolve(`https://download.example/${key}`),
  ),
}));

vi.mock("../utils/permissions", () => ({
  assertCanEdit: vi.fn(),
  assertPermission: vi.fn(),
}));

vi.mock("../utils/boardBackgroundPreview", async (importOriginal) => ({
  ...(await importOriginal<typeof BoardBackgroundPreviewModule>()),
  inspectBoardBackgroundObject: vi.fn(),
  ensureBoardBackgroundPreviews: vi.fn(),
  deleteBoardBackgroundObjects: vi.fn(() => Promise.resolve([])),
}));

const getBoard = vi.mocked(boardRepo.getWorkspaceAndBoardIdByBoardPublicId);
const getBackgrounds = vi.mocked(boardRepo.getBackgroundsByPublicIds);
const updateBoard = vi.mocked(boardRepo.update);
const getWorkspace = vi.mocked(workspaceRepo.getById);
const inspectObject = vi.mocked(inspectBoardBackgroundObject);
const ensurePreviews = vi.mocked(ensureBoardBackgroundPreviews);
const deleteObjects = vi.mocked(deleteBoardBackgroundObjects);
const canEdit = vi.mocked(assertCanEdit);
const canView = vi.mocked(assertPermission);
const signUpload = vi.mocked(generateUploadUrl);
const signDownload = vi.mocked(generateDownloadUrl);

describe("board background media", () => {
  const db = {} as never;
  const user = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  };
  const boardPublicId = "board1234567";
  const workspacePublicId = "worksp123456";
  const uploadKey = `${workspacePublicId}/board-backgrounds/${boardPublicId}/upload123456-background.jpg`;
  const board = {
    id: 1,
    workspaceId: 2,
    createdBy: user.id,
    backgroundImageKey: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "attachments");
    getBoard.mockResolvedValue(board);
    getWorkspace.mockResolvedValue({
      id: board.workspaceId,
      publicId: workspacePublicId,
    } as never);
    canEdit.mockResolvedValue(undefined);
    canView.mockResolvedValue(undefined);
    inspectObject.mockResolvedValue({
      contentLength: 1024,
      contentType: "image/jpeg",
    });
    ensurePreviews.mockResolvedValue({
      previewKeys: [],
      sourceContentType: "image/jpeg",
      reused: false,
    });
    updateBoard.mockResolvedValue({ publicId: boardPublicId, name: "Board" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a board-scoped upload URL after the normal edit check", async () => {
    const result = await boardBackgroundRouter
      .createCaller({ db, user } as never)
      .generateUploadUrl({
        boardPublicId,
        filename: "background.jpg",
        contentType: "image/jpeg",
        size: 1024,
      });

    expect(canEdit).toHaveBeenCalledWith(
      db,
      user.id,
      board.workspaceId,
      "board:edit",
      board.createdBy,
    );
    expect(signUpload).toHaveBeenCalledWith(
      "attachments",
      uploadKey,
      "image/jpeg",
      3600,
    );
    expect(result).toEqual({ url: "https://upload.example", key: uploadKey });
  });

  it("rejects a confirmation key owned by another board", async () => {
    await expect(
      boardBackgroundRouter.createCaller({ db, user } as never).confirm({
        boardPublicId,
        key: `${workspacePublicId}/board-backgrounds/another-board/image.jpg`,
        size: 1024,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(inspectObject).not.toHaveBeenCalled();
    expect(updateBoard).not.toHaveBeenCalled();
  });

  it("validates the stored byte length before decoding", async () => {
    inspectObject.mockResolvedValue({
      contentLength: 2048,
      contentType: "image/jpeg",
    });

    await expect(
      boardBackgroundRouter.createCaller({ db, user } as never).confirm({
        boardPublicId,
        key: uploadKey,
        size: 1024,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(ensurePreviews).not.toHaveBeenCalled();
  });

  it("selects a validated image and removes the replaced objects", async () => {
    const previousKey = `${workspacePublicId}/board-backgrounds/${boardPublicId}/previous.jpg`;
    getBoard.mockResolvedValue({ ...board, backgroundImageKey: previousKey });

    await boardBackgroundRouter.createCaller({ db, user } as never).confirm({
      boardPublicId,
      key: uploadKey,
      size: 1024,
    });

    expect(ensurePreviews).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId,
      s3Key: uploadKey,
    });
    expect(updateBoard).toHaveBeenCalledWith(db, {
      boardPublicId,
      name: undefined,
      slug: undefined,
      visibility: undefined,
      background: { kind: "image", imageKey: uploadKey },
    });
    expect(deleteObjects).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId,
      s3Key: previousKey,
    });
  });

  it("reports invalid image bytes as a bad request", async () => {
    ensurePreviews.mockRejectedValue(
      new BoardBackgroundPreviewError("INVALID_IMAGE", "Invalid image"),
    );

    await expect(
      boardBackgroundRouter.createCaller({ db, user } as never).confirm({
        boardPublicId,
        key: uploadKey,
        size: 1024,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(updateBoard).not.toHaveBeenCalled();
    expect(deleteObjects).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId,
      s3Key: uploadKey,
    });
  });

  it("serves public board previews without a session", async () => {
    getBackgrounds.mockResolvedValue([
      {
        publicId: boardPublicId,
        workspaceId: board.workspaceId,
        visibility: "public",
        backgroundImageKey: uploadKey,
      },
    ]);

    const result = await boardBackgroundRouter
      .createCaller({ db, user: null } as never)
      .urls({ boardPublicIds: [boardPublicId] });

    expect(result[boardPublicId]).toHaveLength(3);
    expect(canView).not.toHaveBeenCalled();
    expect(signDownload).toHaveBeenCalledTimes(3);
  });

  it("does not expose private board previews without a session", async () => {
    getBackgrounds.mockResolvedValue([
      {
        publicId: boardPublicId,
        workspaceId: board.workspaceId,
        visibility: "private",
        backgroundImageKey: uploadKey,
      },
    ]);

    await expect(
      boardBackgroundRouter
        .createCaller({ db, user: null } as never)
        .urls({ boardPublicIds: [boardPublicId] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(signDownload).not.toHaveBeenCalled();
  });

  it("checks each private workspace once for a signed-in user", async () => {
    getBackgrounds.mockResolvedValue([
      {
        publicId: boardPublicId,
        workspaceId: board.workspaceId,
        visibility: "private",
        backgroundImageKey: uploadKey,
      },
      {
        publicId: "board7654321",
        workspaceId: board.workspaceId,
        visibility: "private",
        backgroundImageKey: null,
      },
    ]);

    await boardBackgroundRouter
      .createCaller({ db, user } as never)
      .urls({ boardPublicIds: [boardPublicId, "board7654321"] });

    expect(canView).toHaveBeenCalledTimes(1);
    expect(canView).toHaveBeenCalledWith(
      db,
      user.id,
      board.workspaceId,
      "board:view",
    );
  });

  it("preserves the current image when an idempotent database update fails", async () => {
    getBoard.mockResolvedValue({ ...board, backgroundImageKey: uploadKey });
    updateBoard.mockResolvedValue(undefined);

    await expect(
      boardBackgroundRouter.createCaller({ db, user } as never).confirm({
        boardPublicId,
        key: uploadKey,
        size: 1024,
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    expect(deleteObjects).not.toHaveBeenCalled();
  });
});
