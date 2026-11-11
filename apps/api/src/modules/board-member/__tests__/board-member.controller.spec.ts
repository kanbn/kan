import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BoardMemberController } from "../board-member.controller.js";
import { BoardMemberService } from "../board-member.service.js";

const mockBoardMemberService = {
  all: vi.fn(),
  add: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: BoardMemberController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [BoardMemberController],
    providers: [
      { provide: BoardMemberService, useValue: mockBoardMemberService },
    ],
  }).compile();

  controller = module.get(BoardMemberController);
});

describe("BoardMemberController", () => {
  it("passes the current user's id and path param through to all", async () => {
    mockBoardMemberService.all.mockResolvedValue([]);

    const result = await controller.all(user as never, "board_12345");

    expect(result).toEqual([]);
    expect(mockBoardMemberService.all).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path param and body through to add", async () => {
    mockBoardMemberService.add.mockResolvedValue({
      publicId: "member_12345",
      role: "member",
    });

    const result = await controller.add(user as never, "board_12345", {
      workspaceMemberPublicId: "member_12345",
      role: "member",
    } as never);

    expect(result).toEqual({ publicId: "member_12345", role: "member" });
    expect(mockBoardMemberService.add).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      role: "member",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path params and body through to updateRole", async () => {
    mockBoardMemberService.updateRole.mockResolvedValue({
      publicId: "member_12345",
      role: "admin",
    });

    const result = await controller.updateRole(
      user as never,
      "board_12345",
      "member_12345",
      { role: "admin" } as never,
    );

    expect(result).toEqual({ publicId: "member_12345", role: "admin" });
    expect(mockBoardMemberService.updateRole).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      role: "admin",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path params through to remove", async () => {
    mockBoardMemberService.remove.mockResolvedValue({
      publicId: "member_12345",
    });

    const result = await controller.remove(
      user as never,
      "board_12345",
      "member_12345",
    );

    expect(result).toEqual({ publicId: "member_12345" });
    expect(mockBoardMemberService.remove).toHaveBeenCalledWith({
      boardPublicId: "board_12345",
      workspaceMemberPublicId: "member_12345",
      userId: "user_1",
    });
  });
});
