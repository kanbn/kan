import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@kan/db/repository/board.repo", () => ({
  getWorkspaceAndBoardIdByBoardPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/boardMember.repo", () => ({
  getByBoardId: vi.fn(),
  add: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
  countAdmins: vi.fn(),
  CannotRemoveLastBoardAdminError: class CannotRemoveLastBoardAdminError extends Error {},
}));

vi.mock("@kan/db/repository/member.repo", () => ({
  getByPublicId: vi.fn(),
}));

vi.mock("../utils/permissions", () => ({
  assertPermission: vi.fn(),
  assertBoardAccess: vi.fn(),
  assertCanManageBoardMembers: vi.fn(),
}));

import * as boardRepo from "@kan/db/repository/board.repo";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import {
  assertBoardAccess,
  assertCanManageBoardMembers,
  assertPermission,
} from "../utils/permissions";

const mockGetBoard = boardRepo.getWorkspaceAndBoardIdByBoardPublicId as ReturnType<
  typeof vi.fn
>;
const mockGetByBoardId = boardMemberRepo.getByBoardId as ReturnType<typeof vi.fn>;
const mockAdd = boardMemberRepo.add as ReturnType<typeof vi.fn>;
const mockUpdateRole = boardMemberRepo.updateRole as ReturnType<typeof vi.fn>;
const mockRemove = boardMemberRepo.remove as ReturnType<typeof vi.fn>;
const mockGetMemberByPublicId = memberRepo.getByPublicId as ReturnType<typeof vi.fn>;
const mockAssertPermission = assertPermission as ReturnType<typeof vi.fn>;
const mockAssertBoardAccess = assertBoardAccess as ReturnType<typeof vi.fn>;
const mockAssertCanManageBoardMembers =
  assertCanManageBoardMembers as ReturnType<typeof vi.fn>;

describe("boardMember router", () => {
  const mockDb = {} as never;
  const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };
  const mockBoard = {
    id: 1,
    workspaceId: 10,
    createdBy: "user-123",
    type: "regular" as const,
  };
  const mockTargetMember = {
    id: 5,
    publicId: "wsm-target-12",
    email: "target@example.com",
    workspaceId: 10,
    status: "active" as const,
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertPermission.mockResolvedValue(undefined);
    mockAssertBoardAccess.mockResolvedValue(undefined);
    mockAssertCanManageBoardMembers.mockResolvedValue(undefined);
    mockGetBoard.mockResolvedValue(mockBoard);
    mockGetMemberByPublicId.mockResolvedValue(mockTargetMember);
  });

  describe("all", () => {
    it("throws UNAUTHORIZED when user is not authenticated", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      const ctx = { user: null, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).all({ boardPublicId: "brd-123456789" }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when board does not exist", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockGetBoard.mockResolvedValueOnce(null);
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).all({ boardPublicId: "brd-123456789" }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST for template boards", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockGetBoard.mockResolvedValueOnce({ ...mockBoard, type: "template" });
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).all({ boardPublicId: "brd-123456789" }),
      ).rejects.toThrow(TRPCError);
    });

    it("checks board access before listing members", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockGetByBoardId.mockResolvedValueOnce([]);
      const ctx = { user: mockUser, db: mockDb } as never;

      await boardMemberRouter.createCaller(ctx).all({ boardPublicId: "brd-123456789" });

      expect(mockAssertBoardAccess).toHaveBeenCalledWith(mockDb, mockUser.id, mockBoard);
    });

    it("flattens board members into the response shape", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockGetByBoardId.mockResolvedValueOnce([
        {
          role: "admin",
          createdAt: new Date("2026-01-01"),
          member: {
            publicId: "wsm-abc",
            email: "admin@example.com",
            role: "member",
            status: "active",
            user: { id: "u-1", name: "Admin", email: "admin@example.com", image: null },
          },
        },
      ]);
      const ctx = { user: mockUser, db: mockDb } as never;

      const result = await boardMemberRouter
        .createCaller(ctx)
        .all({ boardPublicId: "brd-123456789" });

      expect(result).toEqual([
        {
          publicId: "wsm-abc",
          email: "admin@example.com",
          status: "active",
          role: "admin",
          workspaceRole: "member",
          createdAt: new Date("2026-01-01"),
          user: { id: "u-1", name: "Admin", email: "admin@example.com", image: null },
        },
      ]);
    });
  });

  describe("add", () => {
    it("requires board member management permission", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockAssertCanManageBoardMembers.mockRejectedValueOnce(
        new TRPCError({ code: "FORBIDDEN", message: "nope" }),
      );
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).add({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
          role: "member",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when the target is not an active workspace member", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockGetMemberByPublicId.mockResolvedValueOnce(null);
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).add({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
          role: "member",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST when the target belongs to a different workspace", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockGetMemberByPublicId.mockResolvedValueOnce({
        ...mockTargetMember,
        workspaceId: 999,
      });
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).add({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
          role: "member",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("throws CONFLICT when the member is already on the board", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockAdd.mockResolvedValueOnce(undefined);
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).add({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
          role: "member",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("adds the workspace member to the board", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockAdd.mockResolvedValueOnce({
        boardId: 1,
        workspaceMemberId: 5,
        role: "member",
      });
      const ctx = { user: mockUser, db: mockDb } as never;

      const result = await boardMemberRouter.createCaller(ctx).add({
        boardPublicId: "brd-123456789",
        workspaceMemberPublicId: "wsm-target-12",
        role: "member",
      });

      expect(result).toEqual({ publicId: "wsm-target-12", role: "member" });
      expect(mockAdd).toHaveBeenCalledWith(mockDb, {
        boardId: 1,
        workspaceMemberId: 5,
        role: "member",
        createdBy: mockUser.id,
      });
    });
  });

  describe("updateRole", () => {
    it("surfaces the repo's last-admin guard as BAD_REQUEST", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockUpdateRole.mockRejectedValueOnce(
        new boardMemberRepo.CannotRemoveLastBoardAdminError(),
      );
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).updateRole({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
          role: "member",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("updates the role when the repo allows it", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockUpdateRole.mockResolvedValueOnce({
        boardId: 1,
        workspaceMemberId: 5,
        role: "member",
      });
      const ctx = { user: mockUser, db: mockDb } as never;

      const result = await boardMemberRouter.createCaller(ctx).updateRole({
        boardPublicId: "brd-123456789",
        workspaceMemberPublicId: "wsm-target-12",
        role: "member",
      });

      expect(result).toEqual({ publicId: "wsm-target-12", role: "member" });
    });

    it("throws NOT_FOUND when the target has no board membership", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockUpdateRole.mockResolvedValueOnce(undefined);
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).updateRole({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
          role: "member",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("remove", () => {
    it("surfaces the repo's last-admin guard as BAD_REQUEST", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockRemove.mockRejectedValueOnce(
        new boardMemberRepo.CannotRemoveLastBoardAdminError(),
      );
      const ctx = { user: mockUser, db: mockDb } as never;

      await expect(
        boardMemberRouter.createCaller(ctx).remove({
          boardPublicId: "brd-123456789",
          workspaceMemberPublicId: "wsm-target-12",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("removes a non-admin board member", async () => {
      const { boardMemberRouter } = await import("./boardMember");
      mockRemove.mockResolvedValueOnce({ boardId: 1, workspaceMemberId: 5 });
      const ctx = { user: mockUser, db: mockDb } as never;

      const result = await boardMemberRouter.createCaller(ctx).remove({
        boardPublicId: "brd-123456789",
        workspaceMemberPublicId: "wsm-target-12",
      });

      expect(result).toEqual({ publicId: "wsm-target-12" });
    });
  });
});
