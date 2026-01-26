import { and, eq, isNull } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import {
  workspaceMemberPermissions,
  workspaceMembers,
  workspaceRolePermissions,
  workspaceRoles,
} from "@kan/db/schema";
import type { Permission, Role } from "@kan/shared";
import { generateUID, getDefaultPermissions } from "@kan/shared";

/**
 * Get permissions by role ID
 */
export const getPermissionsByRoleId = async (
  db: dbClient,
  roleId: number,
): Promise<Permission[]> => {
  const permissions = await db
    .select({ permission: workspaceRolePermissions.permission })
    .from(workspaceRolePermissions)
    .where(
      and(
        eq(workspaceRolePermissions.workspaceRoleId, roleId),
        eq(workspaceRolePermissions.granted, true),
      ),
    );

  return permissions.map((p) => p.permission as Permission);
};

/**
 * Get role by workspace ID and name
 */
export const getRoleByWorkspaceIdAndName = async (
  db: dbClient,
  workspaceId: number,
  name: string,
) => {
  const [role] = await db
    .select()
    .from(workspaceRoles)
    .where(
      and(
        eq(workspaceRoles.workspaceId, workspaceId),
        eq(workspaceRoles.name, name),
      ),
    )
    .limit(1);

  return role;
};

/**
 * Get all custom permission overrides for a workspace member
 */
export const getMemberPermissionOverrides = async (
  db: dbClient,
  workspaceMemberId: number,
) => {
  return db
    .select()
    .from(workspaceMemberPermissions)
    .where(eq(workspaceMemberPermissions.workspaceMemberId, workspaceMemberId));
};

/**
 * Get a single permission override for a member
 */
export const getMemberPermissionOverride = async (
  db: dbClient,
  workspaceMemberId: number,
  permission: string,
) => {
  const [override] = await db
    .select()
    .from(workspaceMemberPermissions)
    .where(
      and(
        eq(workspaceMemberPermissions.workspaceMemberId, workspaceMemberId),
        eq(workspaceMemberPermissions.permission, permission),
      ),
    )
    .limit(1);

  return override;
};

/**
 * Get effective permissions for a workspace member
 * Combines role template (from DB) with custom overrides
 */
export const getMemberEffectivePermissions = async (
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
): Promise<Permission[]> => {
  let roleDefaults: Set<Permission>;

  // Try to get role permissions from database first
  if (roleId) {
    const dbPermissions = await getPermissionsByRoleId(db, roleId);
    roleDefaults = new Set<Permission>(dbPermissions);
  } else {
    // Fallback to code-based defaults if roleId not set
    const codeDefaults = getDefaultPermissions(roleName as Role);
    roleDefaults = new Set<Permission>([...codeDefaults]);
  }

  // Get custom overrides
  const overrides = await getMemberPermissionOverrides(db, workspaceMemberId);

  // Apply overrides
  for (const override of overrides) {
    if (override.granted) {
      roleDefaults.add(override.permission as Permission);
    } else {
      roleDefaults.delete(override.permission as Permission);
    }
  }

  return Array.from(roleDefaults);
};

/**
 * Check if a member has a specific permission
 */
export const memberHasPermission = async (
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
  permission: Permission,
): Promise<boolean> => {
  let hasRoleDefault: boolean;

  // Check role permission from database first
  if (roleId) {
    const dbPermissions = await getPermissionsByRoleId(db, roleId);
    hasRoleDefault = dbPermissions.includes(permission);
  } else {
    // Fallback to code-based defaults
    const codeDefaults = getDefaultPermissions(roleName as Role);
    hasRoleDefault = codeDefaults.includes(permission);
  }

  // Check for override
  const [override] = await db
    .select()
    .from(workspaceMemberPermissions)
    .where(
      and(
        eq(workspaceMemberPermissions.workspaceMemberId, workspaceMemberId),
        eq(workspaceMemberPermissions.permission, permission),
      ),
    )
    .limit(1);

  // Override takes precedence
  if (override) {
    return override.granted;
  }

  return hasRoleDefault;
};

/**
 * Grant a permission to a member
 */
export const grantPermission = async (
  db: dbClient,
  workspaceMemberId: number,
  permission: Permission,
) => {
  const [result] = await db
    .insert(workspaceMemberPermissions)
    .values({
      workspaceMemberId,
      permission,
      granted: true,
    })
    .onConflictDoUpdate({
      target: [
        workspaceMemberPermissions.workspaceMemberId,
        workspaceMemberPermissions.permission,
      ],
      set: {
        granted: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
};

/**
 * Revoke a permission from a member
 */
export const revokePermission = async (
  db: dbClient,
  workspaceMemberId: number,
  permission: Permission,
) => {
  const [result] = await db
    .insert(workspaceMemberPermissions)
    .values({
      workspaceMemberId,
      permission,
      granted: false,
    })
    .onConflictDoUpdate({
      target: [
        workspaceMemberPermissions.workspaceMemberId,
        workspaceMemberPermissions.permission,
      ],
      set: {
        granted: false,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result;
};

/**
 * Get member with their role by userId and workspaceId
 */
export const getMemberWithRole = async (
  db: dbClient,
  userId: string,
  workspaceId: number,
) => {
  const [member] = await db
    .select({
      id: workspaceMembers.id,
      publicId: workspaceMembers.publicId,
      role: workspaceMembers.role,
      roleId: workspaceMembers.roleId,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .limit(1);

  return member;
};

/**
 * Check if user has permission in workspace
 */
export const userHasPermissionInWorkspace = async (
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
): Promise<boolean> => {
  const member = await getMemberWithRole(db, userId, workspaceId);

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
};

/**
 * Get all permissions for a user in a workspace
 */
export const getUserPermissionsInWorkspace = async (
  db: dbClient,
  userId: string,
  workspaceId: number,
): Promise<{
  permissions: Permission[];
  role: string;
  roleId: number | null;
} | null> => {
  const member = await getMemberWithRole(db, userId, workspaceId);

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
};

/**
 * Create a role for a workspace
 */
export const createRole = async (
  db: dbClient,
  args: {
    workspaceId: number;
    name: string;
    description: string;
    hierarchyLevel: number;
    isSystem: boolean;
    permissions: Permission[];
  },
) => {
  const [role] = await db
    .insert(workspaceRoles)
    .values({
      publicId: generateUID(),
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      hierarchyLevel: args.hierarchyLevel,
      isSystem: args.isSystem,
    })
    .returning({
      id: workspaceRoles.id,
      name: workspaceRoles.name,
      publicId: workspaceRoles.publicId,
    });

  if (role && args.permissions.length > 0) {
    await db.insert(workspaceRolePermissions).values(
      args.permissions.map((perm) => ({
        workspaceRoleId: role.id,
        permission: perm,
        granted: true,
      })),
    );
  }

  return role;
};
