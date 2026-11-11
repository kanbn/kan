import type { TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PermissionService } from "../../../permission/permission.service.js";
import { PermissionTools } from "../permission.tools.js";

const mockPermissionService = {
  getMyPermissions: vi.fn(),
  getMemberPermissions: vi.fn(),
  grantPermission: vi.fn(),
  revokePermission: vi.fn(),
  resetMemberPermissions: vi.fn(),
  resetWorkspaceMemberPermissions: vi.fn(),
  getWorkspaceRoles: vi.fn(),
  getWorkspaceRolePermissions: vi.fn(),
  getRolePermissions: vi.fn(),
  grantRolePermission: vi.fn(),
  revokeRolePermission: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let tools: PermissionTools;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PermissionTools,
      { provide: PermissionService, useValue: mockPermissionService },
    ],
  }).compile();

  tools = module.get(PermissionTools);
});

describe("PermissionTools", () => {
  it("passes the authenticated MCP user's id and the args through to getMyPermissions", async () => {
    mockPermissionService.getMyPermissions.mockResolvedValue({
      permissions: [],
      role: "member",
    });

    await tools.getMyPermissions(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(mockPermissionService.getMyPermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to grantMemberPermission", async () => {
    mockPermissionService.grantPermission.mockResolvedValue({
      success: true,
    });

    await tools.grantMemberPermission(
      {
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
        permission: "card:edit",
      },
      undefined,
      { user },
    );

    expect(mockPermissionService.grantPermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to revokeMemberPermission", async () => {
    mockPermissionService.revokePermission.mockResolvedValue({
      success: true,
    });

    await tools.revokeMemberPermission(
      {
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
        permission: "card:edit",
      },
      undefined,
      { user },
    );

    expect(mockPermissionService.revokePermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to resetMemberPermissions", async () => {
    mockPermissionService.resetMemberPermissions.mockResolvedValue({
      success: true,
    });

    await tools.resetMemberPermissions(
      {
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
      },
      undefined,
      { user },
    );

    expect(mockPermissionService.resetMemberPermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to resetWorkspaceMemberPermissions", async () => {
    mockPermissionService.resetWorkspaceMemberPermissions.mockResolvedValue({
      success: true,
    });

    await tools.resetWorkspaceMemberPermissions(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(
      mockPermissionService.resetWorkspaceMemberPermissions,
    ).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to getWorkspaceRoles", async () => {
    mockPermissionService.getWorkspaceRoles.mockResolvedValue({ roles: [] });

    await tools.getWorkspaceRoles(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(mockPermissionService.getWorkspaceRoles).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to getWorkspaceRolePermissions", async () => {
    mockPermissionService.getWorkspaceRolePermissions.mockResolvedValue({
      roles: [],
    });

    await tools.getWorkspaceRolePermissions(
      { workspacePublicId: "workspace_12345" },
      undefined,
      { user },
    );

    expect(
      mockPermissionService.getWorkspaceRolePermissions,
    ).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to getRolePermissions", async () => {
    mockPermissionService.getRolePermissions.mockResolvedValue({
      rolePublicId: "role_12345",
      name: "guest",
      permissions: [],
    });

    await tools.getRolePermissions(
      { workspacePublicId: "workspace_12345", rolePublicId: "role_12345" },
      undefined,
      { user },
    );

    expect(mockPermissionService.getRolePermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_12345",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to grantRolePermission", async () => {
    mockPermissionService.grantRolePermission.mockResolvedValue({
      success: true,
    });

    await tools.grantRolePermission(
      {
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_12345",
        permission: "card:edit",
      },
      undefined,
      { user },
    );

    expect(mockPermissionService.grantRolePermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("passes the authenticated MCP user's id and the args through to revokeRolePermission", async () => {
    mockPermissionService.revokeRolePermission.mockResolvedValue({
      success: true,
    });

    await tools.revokeRolePermission(
      {
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_12345",
        permission: "card:edit",
      },
      undefined,
      { user },
    );

    expect(mockPermissionService.revokeRolePermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("rejects when the MCP request has no authenticated user", async () => {
    await expect(
      tools.getMyPermissions(
        { workspacePublicId: "workspace_12345" },
        undefined,
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockPermissionService.getMyPermissions).not.toHaveBeenCalled();
  });
});
