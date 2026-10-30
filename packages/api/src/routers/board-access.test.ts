import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  assertBoardAccess: vi.fn(),
  assertBoardViewAccess: vi.fn(),
  isWorkspaceAdmin: vi.fn(),
}));

vi.mock("@kan/shared/utils", () => ({
  generateSlug: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
  generateUID: vi.fn(() => "abc123"),
  generateAvatarUrl: vi.fn(),
  convertDueDateFiltersToRanges: vi.fn(() => []),
}));

vi.mock("@kan/shared/constants", () => ({
  colours: [],
}));

import * as boardRepo from "@kan/db/repository/board.repo";
import {
  assertBoardViewAccess,
  assertPermission,
  isWorkspaceAdmin,
} from "../utils/permissions";

const mockGetBoard = boardRepo.getWorkspaceAndBoardIdByBoardPublicId as ReturnType<
  typeof vi.fn
>;
const mockGetByPublicId = boardRepo.getByPublicId as ReturnType<typeof vi.fn>;
const mockGetAllByWorkspaceId = boardRepo.getAllByWorkspaceId as ReturnType<
  typeof vi.fn
>;
const mockAssertPermission = assertPermission as ReturnType<typeof vi.fn>;
const mockAssertBoardViewAccess = assertBoardViewAccess as ReturnType<
  typeof vi.fn
>;
const mockIsWorkspaceAdmin = isWorkspaceAdmin as ReturnType<typeof vi.fn>;

describe("board.byId access gating", () => {
  const mockDb = {} as never;
  const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };
  const mockRegularBoard = {
    id: 1,
    workspaceId: 10,
    createdBy: "user-123",
    type: "regular" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertPermission.mockResolvedValue(undefined);
    mockAssertBoardViewAccess.mockResolvedValue(undefined);
  });

  it("checks board view access (public-sharing aware)", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoard.mockResolvedValueOnce(mockRegularBoard);
    mockGetByPublicId.mockResolvedValueOnce(null);
    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).byId({ boardPublicId: "brd-123456789" }),
    ).rejects.toThrow(TRPCError);

    expect(mockAssertBoardViewAccess).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      mockRegularBoard,
    );
  });

  it("propagates NOT_FOUND from assertBoardViewAccess for uninvited members", async () => {
    const { boardRouter } = await import("./board");
    mockGetBoard.mockResolvedValueOnce(mockRegularBoard);
    mockAssertBoardViewAccess.mockRejectedValueOnce(
      new TRPCError({ code: "NOT_FOUND", message: "Board not found" }),
    );
    const ctx = { user: mockUser, db: mockDb } as never;

    await expect(
      boardRouter.createCaller(ctx).byId({ boardPublicId: "brd-123456789" }),
    ).rejects.toThrow(TRPCError);

    expect(mockGetByPublicId).not.toHaveBeenCalled();
  });
});

describe("board.all visibility scoping", () => {
  const mockDb = {} as never;
  const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };
  const mockWorkspace = { id: 10, publicId: "ws-123456789012" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertPermission.mockResolvedValue(undefined);
    mockGetAllByWorkspaceId.mockResolvedValue([]);
  });

  it("passes isWorkspaceAdmin through to the repo for an admin", async () => {
    const workspaceRepo = await import("@kan/db/repository/workspace.repo");
    const { boardRouter } = await import("./board");
    (workspaceRepo.getByPublicId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockWorkspace,
    );
    mockIsWorkspaceAdmin.mockResolvedValueOnce(true);
    const ctx = { user: mockUser, db: mockDb } as never;

    await boardRouter
      .createCaller(ctx)
      .all({ workspacePublicId: mockWorkspace.publicId });

    expect(mockGetAllByWorkspaceId).toHaveBeenCalledWith(
      mockDb,
      mockWorkspace.id,
      mockUser.id,
      expect.objectContaining({ isWorkspaceAdmin: true }),
    );
  });

  it("passes isWorkspaceAdmin=false through to the repo for a non-admin", async () => {
    const workspaceRepo = await import("@kan/db/repository/workspace.repo");
    const { boardRouter } = await import("./board");
    (workspaceRepo.getByPublicId as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockWorkspace,
    );
    mockIsWorkspaceAdmin.mockResolvedValueOnce(false);
    const ctx = { user: mockUser, db: mockDb } as never;

    await boardRouter
      .createCaller(ctx)
      .all({ workspacePublicId: mockWorkspace.publicId });

    expect(mockGetAllByWorkspaceId).toHaveBeenCalledWith(
      mockDb,
      mockWorkspace.id,
      mockUser.id,
      expect.objectContaining({ isWorkspaceAdmin: false }),
    );
  });
});
