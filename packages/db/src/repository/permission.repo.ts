import { and, eq, isNull, inArray } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import {
  workspaceMemberPermissions,
  workspaceMembers,
  workspaceRolePermissions,
  workspaceRoles,
} from "@kan/db/schema";
import type { Permission, Role } from "@kan/shared";
import { generateUID, getDefaultPermissions } from "@kan/shared";

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

export const getRoleByWorkspaceIdAndPublicId = async (
  db: dbClient,
  workspaceId: number,
  rolePublicId: string,
) => {
  const [role] = await db
    .select()
    .from(workspaceRoles)
    .where(
      and(
        eq(workspaceRoles.workspaceId, workspaceId),
        eq(workspaceRoles.publicId, rolePublicId),
      ),
    )
    .limit(1);

  return role;
};

export const getMemberPermissionOverrides = async (
  db: dbClient,
  workspaceMemberId: number,
) => {
  return db
    .select()
    .from(workspaceMemberPermissions)
    .where(eq(workspaceMemberPermissions.workspaceMemberId, workspaceMemberId));
};

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

export const getMemberEffectivePermissions = async (
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
): Promise<Permission[]> => {
  let roleDefaults: Set<Permission>;

  if (roleId) {
    const dbPermissions = await getPermissionsByRoleId(db, roleId);
    roleDefaults = new Set<Permission>(dbPermissions);
  } else {
    const codeDefaults = getDefaultPermissions(roleName as Role);
    roleDefaults = new Set<Permission>([...codeDefaults]);
  }

  const overrides = await getMemberPermissionOverrides(db, workspaceMemberId);

  for (const override of overrides) {
    if (override.granted) {
      roleDefaults.add(override.permission as Permission);
    } else {
      roleDefaults.delete(override.permission as Permission);
    }
  }

  return Array.from(roleDefaults);
};

export const memberHasPermission = async (
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
  permission: Permission,
): Promise<boolean> => {
  let hasRoleDefault: boolean;

  if (roleId) {
    const dbPermissions = await getPermissionsByRoleId(db, roleId);
    hasRoleDefault = dbPermissions.includes(permission);
  } else {
    const codeDefaults = getDefaultPermissions(roleName as Role);
    hasRoleDefault = codeDefaults.includes(permission);
  }

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

  if (override) {
    return override.granted;
  }

  return hasRoleDefault;
};

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

export const clearMemberPermissionOverrides = async (
  db: dbClient,
  workspaceMemberId: number,
) => {
  await db
    .delete(workspaceMemberPermissions)
    .where(eq(workspaceMemberPermissions.workspaceMemberId, workspaceMemberId));
};

export const clearAllMemberPermissionOverridesForWorkspace = async (
  db: dbClient,
  workspaceId: number,
) => {
  const memberIds = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        isNull(workspaceMembers.deletedAt),
      ),
    );

  if (memberIds.length === 0) return;

  const ids = memberIds.map((m) => m.id);

  await db
    .delete(workspaceMemberPermissions)
    .where(inArray(workspaceMemberPermissions.workspaceMemberId, ids));
};

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
        eq(workspaceMembers.status, "active"),
        isNull(workspaceMembers.deletedAt),
      ),
    )
    .limit(1);

  return member;
};

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

export const grantRolePermission = async (
  db: dbClient,
  roleId: number,
  permission: Permission,
) => {
  const [result] = await db
    .insert(workspaceRolePermissions)
    .values({
      workspaceRoleId: roleId,
      permission,
      granted: true,
    })
    .onConflictDoUpdate({
      target: [
        workspaceRolePermissions.workspaceRoleId,
        workspaceRolePermissions.permission,
      ],
      set: {
        granted: true,
      },
    })
    .returning();

  return result;
};

export const revokeRolePermission = async (
  db: dbClient,
  roleId: number,
  permission: Permission,
) => {
  const [result] = await db
    .insert(workspaceRolePermissions)
    .values({
      workspaceRoleId: roleId,
      permission,
      granted: false,
    })
    .onConflictDoUpdate({
      target: [
        workspaceRolePermissions.workspaceRoleId,
        workspaceRolePermissions.permission,
      ],
      set: {
        granted: false,
      },
    })
    .returning();

  return result;
};

export const getRolesByWorkspaceId = async (
  db: dbClient,
  workspaceId: number,
) => {
  return db
    .select({
      id: workspaceRoles.id,
      publicId: workspaceRoles.publicId,
      name: workspaceRoles.name,
      description: workspaceRoles.description,
      hierarchyLevel: workspaceRoles.hierarchyLevel,
      isSystem: workspaceRoles.isSystem,
    })
    .from(workspaceRoles)
    .where(eq(workspaceRoles.workspaceId, workspaceId));
};


