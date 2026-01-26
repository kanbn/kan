import { TRPCError } from "@trpc/server";

import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import type { Permission, Role } from "@kan/shared";
import { canManageRole, getDefaultPermissions } from "@kan/shared";

/**
 * Get effective permissions for a member by combining role permissions with overrides
 */
export async function getMemberEffectivePermissions(
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
): Promise<Permission[]> {
  let roleDefaults: Set<Permission>;

  // Get role permissions from database or fallback to code defaults
  if (roleId) {
    const dbPermissions = await permissionRepo.getPermissionsByRoleId(
      db,
      roleId,
    );
    roleDefaults = new Set<Permission>(dbPermissions);
  } else {
    const codeDefaults = getDefaultPermissions(roleName as Role);
    roleDefaults = new Set<Permission>([...codeDefaults]);
  }

  // Get and apply custom overrides
  const overrides = await permissionRepo.getMemberPermissionOverrides(
    db,
    workspaceMemberId,
  );

  for (const override of overrides) {
    if (override.granted) {
      roleDefaults.add(override.permission as Permission);
    } else {
      roleDefaults.delete(override.permission as Permission);
    }
  }

  return Array.from(roleDefaults);
}

/**
 * Check if a member has a specific permission
 */
export async function memberHasPermission(
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
  permission: Permission,
): Promise<boolean> {
  let hasRoleDefault: boolean;

  // Check role permission from database or fallback to code defaults
  if (roleId) {
    const dbPermissions = await permissionRepo.getPermissionsByRoleId(
      db,
      roleId,
    );
    hasRoleDefault = dbPermissions.includes(permission);
  } else {
    const codeDefaults = getDefaultPermissions(roleName as Role);
    hasRoleDefault = codeDefaults.includes(permission);
  }

  // Check for override
  const override = await permissionRepo.getMemberPermissionOverride(
    db,
    workspaceMemberId,
    permission,
  );

  // Override takes precedence
  if (override) {
    return override.granted;
  }

  return hasRoleDefault;
}

/**
 * Check if user has a specific permission in a workspace
 */
export async function hasPermission(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
): Promise<boolean> {
  const member = await permissionRepo.getMemberWithRole(db, userId, workspaceId);

  if (!member) {
    return false;
  }

  return memberHasPermission(
    db,
    member.id,
    member.roleId,
    member.role,
    permission,
  );
}

/**
 * Get all permissions for a user in a workspace
 */
export async function getUserPermissions(
  db: dbClient,
  userId: string,
  workspaceId: number,
): Promise<{
  permissions: Permission[];
  role: string;
  roleId: number | null;
} | null> {
  const member = await permissionRepo.getMemberWithRole(db, userId, workspaceId);

  if (!member) {
    return null;
  }

  const permissions = await getMemberEffectivePermissions(
    db,
    member.id,
    member.roleId,
    member.role,
  );

  return {
    permissions,
    role: member.role,
    roleId: member.roleId,
  };
}

/**
 * Assert user has permission - throws FORBIDDEN if not
 */
export async function assertPermission(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
): Promise<void> {
  const hasIt = await hasPermission(db, userId, workspaceId, permission);

  if (!hasIt) {
    throw new TRPCError({
      message: `You do not have permission to perform this action (${permission})`,
      code: "FORBIDDEN",
    });
  }
}

/**
 * Assert user can assign a specific role (based on hierarchy)
 */
export async function assertCanManageRole(
  db: dbClient,
  managerUserId: string,
  workspaceId: number,
  targetRoleName: string,
): Promise<void> {
  const managerMember = await permissionRepo.getMemberWithRole(
    db,
    managerUserId,
    workspaceId,
  );

  if (!managerMember) {
    throw new TRPCError({
      message: "You are not a member of this workspace",
      code: "FORBIDDEN",
    });
  }

  const managerRole = managerMember.role as Role;

  if (!canManageRole(managerRole, targetRoleName as Role)) {
    throw new TRPCError({
      message: `You cannot assign the "${targetRoleName}" role`,
      code: "FORBIDDEN",
    });
  }
}

/**
 * Assert user can manage another member based on role hierarchy
 */
export async function assertCanManageMember(
  db: dbClient,
  managerUserId: string,
  workspaceId: number,
  targetMemberId: number,
): Promise<void> {
  const managerMember = await permissionRepo.getMemberWithRole(
    db,
    managerUserId,
    workspaceId,
  );

  if (!managerMember) {
    throw new TRPCError({
      message: "You are not a member of this workspace",
      code: "FORBIDDEN",
    });
  }

  const targetMember = await memberRepo.getById(db, targetMemberId);

  if (!targetMember) {
    throw new TRPCError({
      message: "Target member not found",
      code: "NOT_FOUND",
    });
  }

  const managerRole = managerMember.role as Role;
  const targetRole = targetMember.role as Role;

  if (!canManageRole(managerRole, targetRole)) {
    throw new TRPCError({
      message: "You cannot manage this member due to role hierarchy",
      code: "FORBIDDEN",
    });
  }
}
