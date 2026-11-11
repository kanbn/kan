import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthenticatedInviteController,
  InviteController,
  WorkspaceMemberController,
} from "../member.controller.js";
import { MemberService } from "../member.service.js";

const mockMemberService = {
  invite: vi.fn(),
  delete: vi.fn(),
  updateRole: vi.fn(),
  getActiveInviteLink: vi.fn(),
  createInviteLink: vi.fn(),
  deactivateInviteLink: vi.fn(),
  getInviteByCode: vi.fn(),
  acceptInviteLink: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };
const fakeRequest = { headers: { cookie: "session=abc" } };

let workspaceController: WorkspaceMemberController;
let inviteController: InviteController;
let authenticatedInviteController: AuthenticatedInviteController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [
      WorkspaceMemberController,
      InviteController,
      AuthenticatedInviteController,
    ],
    providers: [{ provide: MemberService, useValue: mockMemberService }],
  }).compile();

  workspaceController = module.get(WorkspaceMemberController);
  inviteController = module.get(InviteController);
  authenticatedInviteController = module.get(AuthenticatedInviteController);
});

describe("WorkspaceMemberController", () => {
  it("passes the current user's id, path param, body and request headers through to invite", async () => {
    mockMemberService.invite.mockResolvedValue({ publicId: "member_1" });

    const result = await workspaceController.invite(
      user as never,
      "workspace_12345",
      { email: "new@kan.bn" } as never,
      fakeRequest as never,
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
  });

  it("passes the current user's id and path params through to delete", async () => {
    mockMemberService.delete.mockResolvedValue({ success: true });

    const result = await workspaceController.delete(
      user as never,
      "workspace_12345",
      "member_12345",
    );

    expect(result).toEqual({ success: true });
    expect(mockMemberService.delete).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path params and body through to updateRole", async () => {
    mockMemberService.updateRole.mockResolvedValue({
      success: true,
      role: "admin",
    });

    const result = await workspaceController.updateRole(
      user as never,
      "workspace_12345",
      "member_12345",
      { role: "admin" } as never,
    );

    expect(result).toEqual({ success: true, role: "admin" });
    expect(mockMemberService.updateRole).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      role: "admin",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to getActiveInviteLink", async () => {
    mockMemberService.getActiveInviteLink.mockResolvedValue({
      isActive: false,
    });

    const result = await workspaceController.getActiveInviteLink(
      user as never,
      "workspace_12345",
    );

    expect(result).toEqual({ isActive: false });
    expect(mockMemberService.getActiveInviteLink).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to createInviteLink", async () => {
    mockMemberService.createInviteLink.mockResolvedValue({
      publicId: "invite_1",
      inviteCode: "code123",
      inviteLink: "https://kan.bn/invite/code123",
      expiresAt: null,
    });

    const result = await workspaceController.createInviteLink(
      user as never,
      "workspace_12345",
    );

    expect(result.inviteCode).toBe("code123");
    expect(mockMemberService.createInviteLink).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to deactivateInviteLink", async () => {
    mockMemberService.deactivateInviteLink.mockResolvedValue({
      success: true,
    });

    const result = await workspaceController.deactivateInviteLink(
      user as never,
      "workspace_12345",
    );

    expect(result).toEqual({ success: true });
    expect(mockMemberService.deactivateInviteLink).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });
});

describe("InviteController", () => {
  it("passes the path param through to getInviteByCode without requiring a user", async () => {
    mockMemberService.getInviteByCode.mockResolvedValue({
      publicId: "invite_1",
      status: "active",
      expiresAt: null,
    });

    const result = await inviteController.getInviteByCode("code123");

    expect(result.status).toBe("active");
    expect(mockMemberService.getInviteByCode).toHaveBeenCalledWith({
      inviteCode: "code123",
    });
  });
});

describe("AuthenticatedInviteController", () => {
  it("passes the current user's id and body through to acceptInviteLink", async () => {
    mockMemberService.acceptInviteLink.mockResolvedValue({
      success: true,
      workspacePublicId: "workspace_12345",
      workspaceSlug: "acme",
    });

    const result = await authenticatedInviteController.acceptInviteLink(
      user as never,
      { inviteCode: "code123" } as never,
    );

    expect(result.workspaceSlug).toBe("acme");
    expect(mockMemberService.acceptInviteLink).toHaveBeenCalledWith({
      inviteCode: "code123",
      userId: "user_1",
    });
  });
});
