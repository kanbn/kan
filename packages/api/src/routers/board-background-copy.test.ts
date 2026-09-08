import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import {
  cloneBoardBackgroundObjects,
  deleteBoardBackgroundObjects,
} from "../utils/boardBackgroundPreview";
import { assertPermission } from "../utils/permissions";
import { boardRouter } from "./board";

vi.mock("@kan/db/repository/board.repo", () => ({
  getIdByPublicId: vi.fn(),
  getByPublicId: vi.fn(),
  isSlugUnique: vi.fn(),
  createFromSnapshot: vi.fn(),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn(),
}));
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
  generateSlug: vi.fn(() => "copied-board"),
  generateUID: vi.fn(() => "target123456"),
}));
vi.mock("@kan/shared/constants", () => ({ colours: [] }));
vi.mock("../utils/boardBackgroundPreview", () => ({
  cloneBoardBackgroundObjects: vi.fn(),
  deleteBoardBackgroundObjects: vi.fn(() => Promise.resolve([])),
}));

const getWorkspace = vi.mocked(workspaceRepo.getByPublicId);
const getSourceBoardInfo = vi.mocked(boardRepo.getIdByPublicId);
const getSourceBoard = vi.mocked(boardRepo.getByPublicId);
const isSlugUnique = vi.mocked(boardRepo.isSlugUnique);
const createFromSnapshot = vi.mocked(boardRepo.createFromSnapshot);
const assertCanCreate = vi.mocked(assertPermission);
const cloneBackgroundObjects = vi.mocked(cloneBoardBackgroundObjects);
const deleteBackgroundObjects = vi.mocked(deleteBoardBackgroundObjects);

describe("board background copying", () => {
  const db = {} as never;
  const user = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  };
  const workspace = {
    id: 1,
    publicId: "workspace1234",
  };
  const sourceBoard = {
    name: "Source board",
    workspace: { publicId: workspace.publicId },
    labels: [],
    lists: [],
    backgroundColourCode: "#0d9488",
    backgroundImageKey: null as string | null,
  };
  const input = {
    name: "Copied board",
    workspacePublicId: workspace.publicId,
    lists: [],
    labels: [],
    sourceBoardPublicId: "source123456",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "attachments");
    getWorkspace.mockResolvedValue(workspace as never);
    getSourceBoardInfo.mockResolvedValue({
      id: 2,
      type: "regular",
      isArchived: false,
    });
    getSourceBoard.mockResolvedValue(sourceBoard as never);
    isSlugUnique.mockResolvedValue(true);
    assertCanCreate.mockResolvedValue(undefined);
    createFromSnapshot.mockResolvedValue({
      id: 3,
      publicId: "target123456",
      name: input.name,
    });
    cloneBackgroundObjects.mockResolvedValue(
      "workspace1234/board-backgrounds/target123456/source.jpg",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("copies a colour without using object storage", async () => {
    const result = await boardRouter
      .createCaller({ db, user } as never)
      .create(input);

    expect(result).toEqual({ publicId: "target123456", name: input.name });
    expect(cloneBackgroundObjects).not.toHaveBeenCalled();
    expect(createFromSnapshot).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        publicId: "target123456",
        backgroundColourCode: "#0d9488",
        backgroundImageKey: null,
      }),
    );
  });

  it("creates a board-owned copy of an image background", async () => {
    const sourceImageKey =
      "workspace1234/board-backgrounds/source123456/forest image.jpg";
    getSourceBoard.mockResolvedValue({
      ...sourceBoard,
      backgroundImageKey: sourceImageKey,
    } as never);

    await boardRouter.createCaller({ db, user } as never).create(input);

    const targetImageKey =
      "workspace1234/board-backgrounds/target123456/forest_image.jpg";
    expect(cloneBackgroundObjects).toHaveBeenCalledWith({
      bucket: "attachments",
      sourceKey: sourceImageKey,
      targetBoardPublicId: "target123456",
      targetKey: targetImageKey,
    });
    expect(createFromSnapshot).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        publicId: "target123456",
        backgroundColourCode: null,
        backgroundImageKey: targetImageKey,
      }),
    );
  });

  it("removes copied objects when board creation fails", async () => {
    const sourceImageKey =
      "workspace1234/board-backgrounds/source123456/forest.jpg";
    getSourceBoard.mockResolvedValue({
      ...sourceBoard,
      backgroundImageKey: sourceImageKey,
    } as never);
    createFromSnapshot.mockRejectedValue(new Error("database unavailable"));

    await expect(
      boardRouter.createCaller({ db, user } as never).create(input),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create board from source",
    });

    expect(deleteBackgroundObjects).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId: "target123456",
      s3Key: "workspace1234/board-backgrounds/target123456/forest.jpg",
    });
  });

  it("leaves clone failure cleanup to the storage helper", async () => {
    getSourceBoard.mockResolvedValue({
      ...sourceBoard,
      backgroundImageKey:
        "workspace1234/board-backgrounds/source123456/forest.jpg",
    } as never);
    cloneBackgroundObjects.mockRejectedValue(new Error("copy failed"));

    await expect(
      boardRouter.createCaller({ db, user } as never).create(input),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    expect(createFromSnapshot).not.toHaveBeenCalled();
    expect(deleteBackgroundObjects).not.toHaveBeenCalled();
  });
});
