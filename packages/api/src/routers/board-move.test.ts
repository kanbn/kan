import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock all imports used by board.ts before importing the router
vi.mock("@kan/db/repository/board.repo", () => ({
  getBoardForMove: vi.fn(),
  isBoardSlugAvailable: vi.fn(),
  moveToWorkspace: vi.fn(),
  getIdByPublicId: vi.fn(),
  getByPublicId: vi.fn(),
  getWithListIdsByPublicId: vi.fn(),
  getWithLatestListIndexByPublicId: vi.fn(),
  getWorkspaceAndBoardIdByBoardPublicId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updatePositions: vi.fn(),
  archive: vi.fn(),
  deleteBoard: vi.fn(),
  getAllByWorkspaceId: vi.fn(),
  createFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
  getFavorite: vi.fn(),
}));

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/card.repo", () => ({
  getByPublicId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  create: vi.fn(),
}));

vi.mock("@kan/db/repository/label.repo", () => ({
  create: vi.fn(),
  getById: vi.fn(),
  getByPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/list.repo", () => ({
  create: vi.fn(),
  getByPublicId: vi.fn(),
}));

vi.mock("../utils/permissions", () => ({
  assertCanEdit: vi.fn(),
  assertCanDelete: vi.fn(),
  assertPermission: vi.fn(),
}));

vi.mock("@kan/shared/utils", () => ({
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
  generateUID: vi.fn(() => "abc123"),
  generateAvatarUrl: vi.fn(),
  convertDueDateFiltersToRanges: vi.fn(),
}));

vi.mock("@kan/shared/constants", () => ({
  colours: [],
}));

import * as boardRepo from "@kan/db/repository/board.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { assertCanEdit, assertPermission } from "../utils/permissions";

const mockGetBoardForMove = boardRepo.getBoardForMove as ReturnType<typeof vi.fn>;
const mockIsBoardSlugAvailable = boardRepo.isBoardSlugAvailable as ReturnType<typeof vi.fn>;
const mockMoveToWorkspace = boardRepo.moveToWorkspace as ReturnType<typeof vi.fn>;
const mockWorkspaceGetByPublicId = workspaceRepo.getByPublicId as ReturnType<typeof vi.fn>;
const mockAssertCanEdit = assertCanEdit as ReturnType<typeof vi.fn>;
const mockAssertPermission = assertPermission as ReturnType<typeof vi.fn>;

describe("board.move", () => {
  const mockDb = {} as never;
  const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };
  const mockInput = {
    boardPublicId: "brd-123456789",
    targetWorkspacePublicId: "ws-target-789",
  };
  const mockBoard = {
    id: 1,
    name: "My Board",
    slug: "my-board",
    type: "board" as const,
    isArchived: false,
    workspaceId: 10,
    createdBy: "user-123",
  };
  const mockTargetWorkspace = { id: 20, publicId: "ws-target-789" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCanEdit.mockResolvedValue(undefined);
    mockAssertPermission.mockResolvedValue(undefined);
  });

  it("throws UNAUTHORIZED when user is not authenticated", async () => {
    const { boardRouter } = await import("./board");
    const ctx = { user: null, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);
  });

  it("throws NOT_FOUND when board does not exist", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(null);

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST for template boards", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce({ ...mockBoard, type: "template" });

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST for archived boards", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce({ ...mockBoard, isArchived: true });

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);
  });

  it("checks board:edit permission on source workspace", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(mockBoard);
    mockAssertCanEdit.mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "No permission" }),
    );

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);

    expect(mockAssertCanEdit).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      mockBoard.workspaceId,
      "board:edit",
      mockBoard.createdBy,
    );
  });

  it("throws NOT_FOUND when target workspace does not exist", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(mockBoard);
    mockWorkspaceGetByPublicId.mockResolvedValueOnce(null);

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST when target is the same workspace", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(mockBoard);
    mockWorkspaceGetByPublicId.mockResolvedValueOnce({
      id: mockBoard.workspaceId,
      publicId: "ws-target-789",
    });

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);
  });

  it("checks board:create permission on target workspace", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(mockBoard);
    mockWorkspaceGetByPublicId.mockResolvedValueOnce(mockTargetWorkspace);
    mockAssertPermission.mockRejectedValueOnce(
      new TRPCError({ code: "FORBIDDEN", message: "No permission" }),
    );

    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).move(mockInput),
    ).rejects.toThrow(TRPCError);

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      mockTargetWorkspace.id,
      "board:create",
    );
  });

  it("appends UID suffix when slug conflicts in target workspace", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(mockBoard);
    mockWorkspaceGetByPublicId.mockResolvedValueOnce(mockTargetWorkspace);
    mockIsBoardSlugAvailable.mockResolvedValueOnce(false);
    mockMoveToWorkspace.mockResolvedValueOnce(undefined);

    const ctx = { user: mockUser, db: mockDb } as never;

    await boardRouter.createCaller(ctx).move(mockInput);

    expect(mockMoveToWorkspace).toHaveBeenCalledWith(
      mockDb,
      mockBoard.id,
      mockTargetWorkspace.id,
      "my-board-abc123",
    );
  });

  it("moves board successfully with available slug", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoardForMove.mockResolvedValueOnce(mockBoard);
    mockWorkspaceGetByPublicId.mockResolvedValueOnce(mockTargetWorkspace);
    mockIsBoardSlugAvailable.mockResolvedValueOnce(true);
    mockMoveToWorkspace.mockResolvedValueOnce(undefined);

    const ctx = { user: mockUser, db: mockDb } as never;

    const result = await boardRouter.createCaller(ctx).move(mockInput);

    expect(result).toEqual({ success: true });
    expect(mockMoveToWorkspace).toHaveBeenCalledWith(
      mockDb,
      mockBoard.id,
      mockTargetWorkspace.id,
      "my-board",
    );
  });
});
