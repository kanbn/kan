import { beforeEach, describe, expect, it, vi } from "vitest";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as apiPermissions from "@kan/server/utils/permissions";

import { PermissionService } from "../permission.service.js";

const workspace = { id: 1, publicId: "workspace_12345" };
const activeMember = {
  id: 5,
  publicId: "member_12345",
  workspaceId: 1,
  role: "member",
  roleId: 3,
};
const adminRole = {
  id: 2,
  publicId: "role_admin",
  workspaceId: 1,
  name: "admin",
  isSystem: true,
};
const guestRole = {
  id: 4,
  publicId: "role_guest",
  workspaceId: 1,
  name: "guest",
  isSystem: true,
};

let service: PermissionService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(apiPermissions, "assertPermission").mockResolvedValue(undefined);
  vi.spyOn(apiPermissions, "assertCanManageMember").mockResolvedValue(
    undefined,
  );
  vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(
    workspace as never,
  );
  service = new PermissionService();
});

describe("PermissionService.getMyPermissions", () => {
  it("returns the user's effective permissions", async () => {
    vi.spyOn(apiPermissions, "getUserPermissions").mockResolvedValue({
      permissions: ["card:view"],
      role: "member",
      roleId: 3,
    });

    const result = await service.getMyPermissions({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({
      permissions: ["card:view"],
      role: "member",
      roleId: 3,
    });
  });

  it("throws FORBIDDEN when the user isn't a member of the workspace", async () => {
    vi.spyOn(apiPermissions, "getUserPermissions").mockResolvedValue(null);

    await expect(
      service.getMyPermissions({
        workspacePublicId: "workspace_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("PermissionService.getMemberPermissions", () => {
  it("returns the member's effective permissions and overrides", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    vi.spyOn(apiPermissions, "getMemberEffectivePermissions").mockResolvedValue(
      ["card:view", "card:edit"],
    );
    vi.spyOn(permissionRepo, "getMemberPermissionOverrides").mockResolvedValue([
      { permission: "card:edit", granted: true },
    ] as never);

    const result = await service.getMemberPermissions({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });

    expect(result).toEqual({
      memberPublicId: "member_12345",
      role: "member",
      permissions: ["card:view", "card:edit"],
      overrides: [{ permission: "card:edit", granted: true }],
    });
  });

  it("throws NOT_FOUND when the member belongs to a different workspace", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue({
      ...activeMember,
      workspaceId: 999,
    } as never);

    await expect(
      service.getMemberPermissions({
        workspacePublicId: "workspace_12345",
        memberPublicId: "member_12345",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("PermissionService.grantPermission / revokePermission", () => {
  it("grants a permission override to a member", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    const grant = vi
      .spyOn(permissionRepo, "grantPermission")
      .mockResolvedValue(undefined);

    const result = await service.grantPermission({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      permission: "card:edit",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(grant).toHaveBeenCalledWith(expect.anything(), 5, "card:edit");
    expect(apiPermissions.assertCanManageMember).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      1,
      5,
    );
  });

  it("revokes a permission override from a member", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    const revoke = vi
      .spyOn(permissionRepo, "revokePermission")
      .mockResolvedValue(undefined);

    const result = await service.revokePermission({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      permission: "card:edit",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(revoke).toHaveBeenCalledWith(expect.anything(), 5, "card:edit");
  });
});

describe("PermissionService.resetMemberPermissions", () => {
  it("clears a member's permission overrides", async () => {
    vi.spyOn(memberRepo, "getByPublicId").mockResolvedValue(
      activeMember as never,
    );
    const clear = vi
      .spyOn(permissionRepo, "clearMemberPermissionOverrides")
      .mockResolvedValue(undefined);

    const result = await service.resetMemberPermissions({
      workspacePublicId: "workspace_12345",
      memberPublicId: "member_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(clear).toHaveBeenCalledWith(expect.anything(), 5);
  });
});

describe("PermissionService.resetWorkspaceMemberPermissions", () => {
  it("clears overrides for every member in the workspace", async () => {
    const clearAll = vi
      .spyOn(permissionRepo, "clearAllMemberPermissionOverridesForWorkspace")
      .mockResolvedValue(undefined);

    const result = await service.resetWorkspaceMemberPermissions({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(clearAll).toHaveBeenCalledWith(expect.anything(), 1);
  });
});

describe("PermissionService.getWorkspaceRoles", () => {
  it("returns the workspace's roles", async () => {
    vi.spyOn(permissionRepo, "getRolesByWorkspaceId").mockResolvedValue([
      {
        id: 2,
        publicId: "role_admin",
        name: "admin",
        description: null,
        hierarchyLevel: 0,
        isSystem: true,
      },
    ] as never);

    const result = await service.getWorkspaceRoles({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({
      roles: [
        {
          publicId: "role_admin",
          name: "admin",
          description: null,
          hierarchyLevel: 0,
          isSystem: true,
        },
      ],
    });
  });
});

describe("PermissionService.getWorkspaceRolePermissions", () => {
  it("returns every role with its permissions", async () => {
    vi.spyOn(permissionRepo, "getRolesByWorkspaceId").mockResolvedValue([
      adminRole,
    ] as never);
    vi.spyOn(permissionRepo, "getPermissionsByRoleId").mockResolvedValue([
      "workspace:manage",
    ] as never);

    const result = await service.getWorkspaceRolePermissions({
      workspacePublicId: "workspace_12345",
      userId: "user_1",
    });

    expect(result).toEqual({
      roles: [
        {
          publicId: "role_admin",
          name: "admin",
          permissions: ["workspace:manage"],
        },
      ],
    });
  });
});

describe("PermissionService.getRolePermissions", () => {
  it("returns the role's permissions", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(guestRole as never);
    vi.spyOn(permissionRepo, "getPermissionsByRoleId").mockResolvedValue([
      "card:view",
    ] as never);

    const result = await service.getRolePermissions({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_guest",
      userId: "user_1",
    });

    expect(result).toEqual({
      rolePublicId: "role_guest",
      name: "guest",
      permissions: ["card:view"],
    });
  });

  it("throws NOT_FOUND for an unknown role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(undefined);

    await expect(
      service.getRolePermissions({
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_missing",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("PermissionService.grantRolePermission", () => {
  it("grants a permission to a non-admin role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(guestRole as never);
    const grant = vi
      .spyOn(permissionRepo, "grantRolePermission")
      .mockResolvedValue(undefined);

    const result = await service.grantRolePermission({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_guest",
      permission: "card:edit",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(grant).toHaveBeenCalledWith(expect.anything(), 4, "card:edit");
  });

  it("throws FORBIDDEN when modifying the system admin role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(adminRole as never);

    await expect(
      service.grantRolePermission({
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_admin",
        permission: "card:edit",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws FORBIDDEN when granting workspace:manage to a non-admin role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(guestRole as never);

    await expect(
      service.grantRolePermission({
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_guest",
        permission: "workspace:manage",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws FORBIDDEN when granting workspace:delete to a non-admin role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(guestRole as never);

    await expect(
      service.grantRolePermission({
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_guest",
        permission: "workspace:delete",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("PermissionService.revokeRolePermission", () => {
  it("revokes a permission from a non-admin role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(guestRole as never);
    const revoke = vi
      .spyOn(permissionRepo, "revokeRolePermission")
      .mockResolvedValue(undefined);

    const result = await service.revokeRolePermission({
      workspacePublicId: "workspace_12345",
      rolePublicId: "role_guest",
      permission: "card:edit",
      userId: "user_1",
    });

    expect(result).toEqual({ success: true });
    expect(revoke).toHaveBeenCalledWith(expect.anything(), 4, "card:edit");
  });

  it("throws FORBIDDEN when modifying the system admin role", async () => {
    vi.spyOn(
      permissionRepo,
      "getRoleByWorkspaceIdAndPublicId",
    ).mockResolvedValue(adminRole as never);

    await expect(
      service.revokeRolePermission({
        workspacePublicId: "workspace_12345",
        rolePublicId: "role_admin",
        permission: "card:edit",
        userId: "user_1",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
