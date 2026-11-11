import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberService } from "../../../member/member.service.js";
import { MemberTools } from "../member.tools.js";

const mockMemberService = {
  invite: vi.fn(),
  delete: vi.fn(),
  updateRole: vi.fn(),
  getActiveInviteLink: vi.fn(),
  createInviteLink: vi.fn(),
  deactivateInviteLink: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: MemberTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MemberTools,
      { provide: MemberService, useValue: mockMemberService },
    ],
  }).compile();

  tools = module.get(MemberTools);
});

describe("MemberTools", () => {
  it("passes the authenticated MCP user's id, the args, and request headers through to inviteMember", async () => {
    mockMemberService.invite.mockResolvedValue({ publicId: "member_1" });

    const result = await tools.inviteMember(
      { workspacePublicId: "workspace_12345", email: "new@kan.bn" },
      undefined,
      { user, headers: { cookie: "session=abc" } },
    );

    expect(result).toEqual({ publicId: "member_1" });
    const call = mockMemberService.invite.mock.calls[0]?.[0] as {
      headers: Headers;
    };
    expect(call).toMatchObject({
      workspacePublicId: "workspace_12345",
      email: "new@kan.bn",
      userId: "user_1",
    });
    expect(call.headers).toBeInstanceOf(Headers);
    expect(call.headers.get("cookie")).toBe("session=abc");
  });

  it("passes the authenticated MCP user's id and the args through to removeMember", async () => {
    mockMemberService.delete.mockResolvedValue({ success: true });

    const result = await tools.removeMember(
      { workspacePublicId: "workspace_12345", memberPublicId: "member_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockMemberService.delete).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to updateMemberRole", async () => {
    mockMemberService.updateRole.mockResolvedValue({
      success: true,
      role: "admin",
    });

    const result = await tools.updateMemberRole(
      {
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
        role: "admin",
      },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true, role: "admin" });
    expect(mockMemberService.updateRole).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      role: "admin",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to getWorkspaceInviteLink", async () => {
    mockMemberService.getActiveInviteLink.mockResolvedValue({
      isActive: false,
    });

    const result = await tools.getWorkspaceInviteLink(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ isActive: false });
    expect(mockMemberService.getActiveInviteLink).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to createWorkspaceInviteLink", async () => {
    mockMemberService.createInviteLink.mockResolvedValue({
      publicId: "invite_1",
      inviteCode: "code123",
      inviteLink: "https://kan.bn/invite/code123",
      expiresAt: null,
    });

    const result = await tools.createWorkspaceInviteLink(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(result.inviteCode).toBe("code123");
    expect(mockMemberService.createInviteLink).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to deactivateWorkspaceInviteLinks", async () => {
    mockMemberService.deactivateInviteLink.mockResolvedValue({
      success: true,
    });

    const result = await tools.deactivateWorkspaceInviteLinks(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(result).toEqual({ success: true });
    expect(mockMemberService.deactivateInviteLink).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.removeMember(
        {
          workspacePublicId: "workspace_12345",
          memberPublicId: "member_12345",
        },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockMemberService.delete).not.toHaveBeenCalled();
  });
});
