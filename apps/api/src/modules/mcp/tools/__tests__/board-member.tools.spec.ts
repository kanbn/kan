import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BoardMemberService } from "../../../board-member/board-member.service.js";
import { BoardMemberTools } from "../board-member.tools.js";

const mockBoardMemberService = {
  all: vi.fn(),
  add: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: BoardMemberTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      BoardMemberTools,
      { provide: BoardMemberService, useValue: mockBoardMemberService },
    ],
  }).compile();

  tools = module.get(BoardMemberTools);
});

describe("BoardMemberTools", () => {
  it("passes the authenticated MCP user's id and args through to listBoardMembers", async () => {
    mockBoardMemberService.all.mockResolvedValue([]);

    const result = await tools.listBoardMembers(
      { boardPublicId: "board_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual([]);
    expect(mockBoardMemberService.all).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and args through to addBoardMember", async () => {
    mockBoardMemberService.add.mockResolvedValue({
      publicId: "member_12345",
      role: "member",
    });

    const result = await tools.addBoardMember(
      {
        boardPublicId: "board_12345",
        workspaceMemberPublicId: "member_12345",
        role: "member",
      },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "member_12345", role: "member" });
    expect(mockBoardMemberService.add).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      role: "member",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and args through to updateBoardMemberRole", async () => {
    mockBoardMemberService.updateRole.mockResolvedValue({
      publicId: "member_12345",
      role: "admin",
    });

    const result = await tools.updateBoardMemberRole(
      {
        boardPublicId: "board_12345",
        workspaceMemberPublicId: "member_12345",
        role: "admin",
      },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "member_12345", role: "admin" });
    expect(mockBoardMemberService.updateRole).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      role: "admin",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and args through to removeBoardMember", async () => {
    mockBoardMemberService.remove.mockResolvedValue({
      publicId: "member_12345",
    });

    const result = await tools.removeBoardMember(
      { boardPublicId: "board_12345", workspaceMemberPublicId: "member_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ publicId: "member_12345" });
    expect(mockBoardMemberService.remove).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      userId: "user_1",
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.listBoardMembers(
        { boardPublicId: "board_12345" },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockBoardMemberService.all).not.toHaveBeenCalled();
  });
});
