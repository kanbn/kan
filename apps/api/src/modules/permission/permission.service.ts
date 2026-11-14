import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type { Permission } from "@kan/shared";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import {
  assertCanManageMember,
  assertPermission,
  getMemberEffectivePermissions,
  getUserPermissions,
} from "@kan/server/utils/permissions";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

@Injectable()
export class PermissionService {
  private async getMemberOrThrow(memberPublicId: string, workspaceId: number) {
    const member = await memberRepo.getByPublicId(db, memberPublicId);

    if (member?.workspaceId !== workspaceId)
      throw new NotFoundException("Member not found");

    return member;
  }

  private async getRoleOrThrow(rolePublicId: string, workspaceId: number) {
    const role = await permissionRepo.getRoleByWorkspaceIdAndPublicId(
      db,
      workspaceId,
      rolePublicId,
    );

    if (!role) throw new NotFoundException("Role not found");

    return role;
  }

  async getMyPermissions(input: { workspacePublicId: string; userId: string }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    const result = await getUserPermissions(db, input.userId, workspace.id);

    if (!result)
      throw new ForbiddenException("You are not a member of this workspace");

    return result;
  }

  async getMemberPermissions(input: {
    workspacePublicId: string;
    memberPublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:view");

    const member = await this.getMemberOrThrow(
      input.memberPublicId,
      workspace.id,
    );

    const effectivePermissions = await getMemberEffectivePermissions(
      db,
      member.id,
      member.roleId ?? null,
      member.role,
    );
    const overrides = await permissionRepo.getMemberPermissionOverrides(
      db,
      member.id,
    );

    return {
      memberPublicId: member.publicId,
      role: member.role,
      permissions: effectivePermissions,
      overrides: overrides.map((o) => ({
        permission: o.permission,
        granted: o.granted,
      })),
    };
  }

  async grantPermission(input: {
    workspacePublicId: string;
    memberPublicId: string;
    permission: Permission;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    const member = await this.getMemberOrThrow(
      input.memberPublicId,
      workspace.id,
    );

    await assertCanManageMember(db, input.userId, workspace.id, member.id);

    await permissionRepo.grantPermission(db, member.id, input.permission);

    return { success: true };
  }

  async revokePermission(input: {
    workspacePublicId: string;
    memberPublicId: string;
    permission: Permission;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    const member = await this.getMemberOrThrow(
      input.memberPublicId,
      workspace.id,
    );

    await assertCanManageMember(db, input.userId, workspace.id, member.id);

    await permissionRepo.revokePermission(db, member.id, input.permission);

    return { success: true };
  }

  async resetMemberPermissions(input: {
    workspacePublicId: string;
    memberPublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    const member = await this.getMemberOrThrow(
      input.memberPublicId,
      workspace.id,
    );

    await assertCanManageMember(db, input.userId, workspace.id, member.id);

    await permissionRepo.clearMemberPermissionOverrides(db, member.id);

    return { success: true };
  }

  async resetWorkspaceMemberPermissions(input: {
    workspacePublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    await permissionRepo.clearAllMemberPermissionOverridesForWorkspace(
      db,
      workspace.id,
    );

    return { success: true };
  }

  async getWorkspaceRoles(input: {
    workspacePublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:view");

    const roles = await permissionRepo.getRolesByWorkspaceId(db, workspace.id);

    return {
      roles: roles.map((role) => ({
        publicId: role.publicId,
        name: role.name,
        description: role.description ?? null,
        hierarchyLevel: role.hierarchyLevel,
        isSystem: role.isSystem,
      })),
    };
  }

  async getWorkspaceRolePermissions(input: {
    workspacePublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:view");

    const roles = await permissionRepo.getRolesByWorkspaceId(db, workspace.id);

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissionsForRole = await permissionRepo.getPermissionsByRoleId(
          db,
          role.id,
        );

        return {
          publicId: role.publicId,
          name: role.name,
          permissions: permissionsForRole,
        };
      }),
    );

    return { roles: rolesWithPermissions };
  }

  async getRolePermissions(input: {
    workspacePublicId: string;
    rolePublicId: string;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:view");

    const role = await this.getRoleOrThrow(input.rolePublicId, workspace.id);

    const permissionsForRole = await permissionRepo.getPermissionsByRoleId(
      db,
      role.id,
    );

    return {
      rolePublicId: role.publicId,
      name: role.name,
      permissions: permissionsForRole,
    };
  }

  async grantRolePermission(input: {
    workspacePublicId: string;
    rolePublicId: string;
    permission: Permission;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    const role = await this.getRoleOrThrow(input.rolePublicId, workspace.id);

    if (role.name === "admin" && role.isSystem)
      throw new ForbiddenException("Admin role permissions cannot be modified");

    if (
      (input.permission === "workspace:manage" ||
        input.permission === "workspace:delete") &&
      role.name !== "admin"
    )
      throw new ForbiddenException(
        "Only the admin role can manage billing or delete the workspace",
      );

    await permissionRepo.grantRolePermission(db, role.id, input.permission);

    return { success: true };
  }

  async revokeRolePermission(input: {
    workspacePublicId: string;
    rolePublicId: string;
    permission: Permission;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "member:edit");

    const role = await this.getRoleOrThrow(input.rolePublicId, workspace.id);

    if (role.name === "admin" && role.isSystem)
      throw new ForbiddenException("Admin role permissions cannot be modified");

    await permissionRepo.revokeRolePermission(db, role.id, input.permission);

    return { success: true };
  }
}
