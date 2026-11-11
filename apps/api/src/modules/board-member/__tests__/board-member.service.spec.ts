import { beforeEach, describe, expect, it, vi } from "vitest";

import * as permissions from "@kan/api/utils/permissions";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as memberRepo from "@kan/db/repository/member.repo";

import { BoardMemberService } from "../board-member.service.js";

const regularBoard = {
  id: 1,
  workspaceId: 1,
  createdBy: "user_1",
  type: "regular" as const,
  visibility: "workspace" as const,
  deletedAt: null,
};

const activeMember = {
  id: 2,
  publicId: "member_12345",
  workspaceId: 1,
  email: "member@kan.bn",
  status: "active",
  deletedAt: null,
};

let service: BoardMemberService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertBoardAccess").mockResolvedValue(undefined);
  vi.spyOn(permissions, "assertCanManageBoardMembers").mockResolvedValue(
    undefined,
  );
  vi.spyOn(
    boardRepo,
    "getWorkspaceAndBoardIdByBoardPublicId",
  ).mockResolvedValue(regularBoard as never);
  service = new BoardMemberService();
});

describe("BoardMemberService.all", () => {
  it("lists a board's members", async () => {
    vi.spyOn(boardMemberRepo, "getByBoardId").mockResolvedValue([
      {
        role: "admin",
        createdAt: new Date("2024-01-01"),
        member: {
          publicId: "member_12345",
          email: "member@kan.bn",
          role: "member",
          status: "active",
          user: {
            id: "user_2",
            name: "Jo",
            email: "member@kan.bn",
            image: null,
          },
        },
      },
    ] as never);

    const result = await service.all({
      boardPublicId: "board_12345",
      userId: "user_1",
    });

    expect(result).toEqual([
      {
        publicId: "member_12345",
        email: "member@kan.bn",
        status: "active",
        role: "admin",
        workspaceRole: "member",
        createdAt: "2024-01-01T00:00:00.000Z",
        user: { id: "user_2", name: "Jo", email: "member@kan.bn", image: null },
      },
    ]);
  });

  it("throws BAD_REQUEST for a non-regular board", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue({ ...regularBoard, type: "template" } as never);

    await expect(
      service.all({ boardPublicId: "board_12345", userId: "user_1" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws NOT_FOUND for a deleted board", async () => {
    vi.spyOn(
      boardRepo,
      "getWorkspaceAndBoardIdByBoardPublicId",
    ).mockResolvedValue({ ...regularBoard, deletedAt: new Date() } as never);

    await expect(
      service.all({ boardPublicId: "board_12345", userId: "user_1" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("BoardMemberService.add", () => {
  it("adds an active workspace member to the board", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    vi.spyOn(boardMemberRepo, "add").mockResolvedValue({
      role: "member",
    } as never);

    const result = await service.add({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      role: "member",
      userId: "user_1",
    });

    expect(result).toEqual({ publicId: "member_12345", role: "member" });
  });

  it("throws CONFLICT when the member is already on the board", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    vi.spyOn(boardMemberRepo, "add").mockResolvedValue(undefined);

    await expect(
      service.add({
        boardPublicId: "board_12345",
        workspaceMemberPublicId: "member_12345",
        role: "member",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("throws BAD_REQUEST when the member isn't active", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      ...activeMember,
      status: "invited",
    } as never);

    await expect(
      service.add({
        boardPublicId: "board_12345",
        workspaceMemberPublicId: "member_12345",
        role: "member",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("BoardMemberService.updateRole", () => {
  it("updates the member's role", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    vi.spyOn(boardMemberRepo, "updateRole").mockResolvedValue({
      role: "admin",
    } as never);

    const result = await service.updateRole({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      role: "admin",
      userId: "user_1",
    });

    expect(result).toEqual({ publicId: "member_12345", role: "admin" });
  });

  it("converts CannotRemoveLastBoardAdminError to BAD_REQUEST", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      ...activeMember,
      status: "active",
    } as never);
    vi.spyOn(boardMemberRepo, "updateRole").mockRejectedValue(
      new boardMemberRepo.CannotRemoveLastBoardAdminError(),
    );

    await expect(
      service.updateRole({
        boardPublicId: "board_12345",
        workspaceMemberPublicId: "member_12345",
        role: "member",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("BoardMemberService.remove", () => {
  it("removes the member from the board", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    vi.spyOn(boardMemberRepo, "remove").mockResolvedValue({ id: 1 } as never);

    const result = await service.remove({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ publicId: "member_12345" });
  });

  it("converts CannotRemoveLastBoardAdminError to BAD_REQUEST", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    vi.spyOn(boardMemberRepo, "remove").mockRejectedValue(
      new boardMemberRepo.CannotRemoveLastBoardAdminError(),
    );

    await expect(
      service.remove({
        boardPublicId: "board_12345",
        workspaceMemberPublicId: "member_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
