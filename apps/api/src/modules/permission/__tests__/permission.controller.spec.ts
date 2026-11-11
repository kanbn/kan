import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PermissionController } from "../permission.controller.js";
import { PermissionService } from "../permission.service.js";

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

let controller: PermissionController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [PermissionController],
    providers: [
      { provide: PermissionService, useValue: mockPermissionService },
    ],
  }).compile();

  controller = module.get(PermissionController);
});

describe("PermissionController", () => {
  it("passes the current user's id and path param through to getMyPermissions", async () => {
    mockPermissionService.getMyPermissions.mockResolvedValue({
      permissions: ["card:view"],
      role: "member",
    });

    const result = await controller.getMyPermissions(
      user as never,
      "workspace_12345",
    );

    expect(result).toEqual({ permissions: ["card:view"], role: "member" });
    expect(mockPermissionService.getMyPermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path params through to getMemberPermissions", async () => {
    mockPermissionService.getMemberPermissions.mockResolvedValue({
      memberPublicId: "member_12345",
      role: "member",
      permissions: [],
      overrides: [],
    });

    await controller.getMemberPermissions(
      user as never,
      "workspace_12345",
      "member_12345",
    );

    expect(mockPermissionService.getMemberPermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path params and body through to grantPermission", async () => {
    mockPermissionService.grantPermission.mockResolvedValue({ success: true });

    const result = await controller.grantPermission(
      user as never,
      "workspace_12345",
      "member_12345",
      { permission: "card:edit" } as never,
    );

    expect(result).toEqual({ success: true });
    expect(mockPermissionService.grantPermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path params and body through to revokePermission", async () => {
    mockPermissionService.revokePermission.mockResolvedValue({
      success: true,
    });

    await controller.revokePermission(
      user as never,
      "workspace_12345",
      "member_12345",
      { permission: "card:edit" } as never,
    );

    expect(mockPermissionService.revokePermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path params through to resetMemberPermissions", async () => {
    mockPermissionService.resetMemberPermissions.mockResolvedValue({
      success: true,
    });

    await controller.resetMemberPermissions(
      user as never,
      "workspace_12345",
      "member_12345",
    );

    expect(mockPermissionService.resetMemberPermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to resetWorkspaceMemberPermissions", async () => {
    mockPermissionService.resetWorkspaceMemberPermissions.mockResolvedValue({
      success: true,
    });

    await controller.resetWorkspaceMemberPermissions(
      user as never,
      "workspace_12345",
    );

    expect(
      mockPermissionService.resetWorkspaceMemberPermissions,
    ).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to getWorkspaceRoles", async () => {
    mockPermissionService.getWorkspaceRoles.mockResolvedValue({ roles: [] });

    await controller.getWorkspaceRoles(user as never, "workspace_12345");

    expect(mockPermissionService.getWorkspaceRoles).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path param through to getWorkspaceRolePermissions", async () => {
    mockPermissionService.getWorkspaceRolePermissions.mockResolvedValue({
      roles: [],
    });

    await controller.getWorkspaceRolePermissions(
      user as never,
      "workspace_12345",
    );

    expect(
      mockPermissionService.getWorkspaceRolePermissions,
    ).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id and path params through to getRolePermissions", async () => {
    mockPermissionService.getRolePermissions.mockResolvedValue({
      rolePublicId: "role_12345",
      name: "admin",
      permissions: [],
    });

    await controller.getRolePermissions(
      user as never,
      "workspace_12345",
      "role_12345",
    );

    expect(mockPermissionService.getRolePermissions).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_12345",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path params and body through to grantRolePermission", async () => {
    mockPermissionService.grantRolePermission.mockResolvedValue({
      success: true,
    });

    await controller.grantRolePermission(
      user as never,
      "workspace_12345",
      "role_12345",
      { permission: "card:edit" } as never,
    );

    expect(mockPermissionService.grantRolePermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });

  it("passes the current user's id, path params and body through to revokeRolePermission", async () => {
    mockPermissionService.revokeRolePermission.mockResolvedValue({
      success: true,
    });

    await controller.revokeRolePermission(
      user as never,
      "workspace_12345",
      "role_12345",
      { permission: "card:edit" } as never,
    );

    expect(mockPermissionService.revokeRolePermission).toHaveBeenCalledWith({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_12345",
      permission: "card:edit",
      userId: "user_1",
    });
  });
});
