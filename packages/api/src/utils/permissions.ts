import { TRPCError } from "@trpc/server";

import type { dbClient } from "@kan/db/client";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
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

  const managerRole = managerMember.role;

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

  const managerRole = managerMember.role;
  const targetRole = targetMember.role;

  if (!canManageRole(managerRole, targetRole)) {
    throw new TRPCError({
      message: "You cannot manage this member due to role hierarchy",
      code: "FORBIDDEN",
    });
  }
}

/**
 * Assert user can delete an entity - either has the delete permission OR is the creator
 */
export async function assertCanDelete(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
  createdBy: string | null,
): Promise<void> {
  // Check if user has the general delete permission
  const hasDeletePermission = await hasPermission(db, userId, workspaceId, permission);

  // If user has permission, allow deletion
  if (hasDeletePermission) {
    return;
  }

  // If user doesn't have permission, check if they are the creator
  if (createdBy && createdBy === userId) {
    return;
  }

  // Neither condition met - deny deletion
  throw new TRPCError({
    message: `You do not have permission to delete this entity (${permission})`,
    code: "FORBIDDEN",
  });
}

/**
 * Assert user can edit an entity - either has the edit permission OR is the creator
 */
export async function assertCanEdit(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
  createdBy: string | null,
): Promise<void> {
  // Check if user has the general edit permission
  const hasEditPermission = await hasPermission(db, userId, workspaceId, permission);

  // If user has permission, allow editing
  if (hasEditPermission) {
    return;
  }

  // If user doesn't have permission, check if they are the creator
  if (createdBy && createdBy === userId) {
    return;
  }

  // Neither condition met - deny editing
  throw new TRPCError({
    message: `You do not have permission to edit this entity (${permission})`,
    code: "FORBIDDEN",
  });
}

/**
 * Check if a user holds the workspace-level "admin" role (distinct from
 * board-level admin, and from any custom role/permission overrides).
 */
export async function isWorkspaceAdmin(
  db: dbClient,
  userId: string,
  workspaceId: number,
): Promise<boolean> {
  const member = await permissionRepo.getMemberWithRole(
    db,
    userId,
    workspaceId,
  );

  return member?.role === "admin";
}

/**
 * Check if a user can see a specific board: templates stay open to the
 * whole workspace, workspace admins see every board, everyone else must
 * hold an explicit board membership.
 */
export async function hasBoardAccess(
  db: dbClient,
  userId: string,
  board: { id: number; workspaceId: number; type: string },
): Promise<boolean> {
  if (board.type !== "regular") return true;

  const member = await permissionRepo.getMemberWithRole(
    db,
    userId,
    board.workspaceId,
  );

  if (!member) return false;
  if (member.role === "admin") return true;

  const membership = await boardMemberRepo.getMembership(db, {
    boardId: board.id,
    userId,
  });

  return !!membership;
}

/**
 * Assert a user can see a board - throws NOT_FOUND (rather than FORBIDDEN)
 * since uninvited boards should be invisible, not merely inaccessible.
 *
 * This is the strict check: it does NOT treat "public" boards as open to
 * the whole workspace. Use it to gate reads and writes of board-scoped
 * content (cards, lists, labels, ...), where "public" only ever means
 * "viewable via the public share link", never "editable by any member".
 * For board-level read endpoints that should also honor public sharing,
 * use assertBoardViewAccess instead.
 */
export async function assertBoardAccess(
  db: dbClient,
  userId: string,
  board: { id: number; workspaceId: number; type: string },
): Promise<void> {
  const allowed = await hasBoardAccess(db, userId, board);

  if (!allowed) {
    throw new TRPCError({
      message: `Board not found`,
      code: "NOT_FOUND",
    });
  }
}

/**
 * Like assertBoardAccess, but a "public" board is also visible to every
 * workspace member - matching the pre-existing public share-link feature,
 * which already lets even anonymous, non-workspace users view it. Reserved
 * for read-only board endpoints (board.byId, board.all, label.byPublicId);
 * mutations must keep using assertBoardAccess.
 */
export async function assertBoardViewAccess(
  db: dbClient,
  userId: string,
  board: { id: number; workspaceId: number; type: string; visibility: string },
): Promise<void> {
  if (board.visibility === "public") return;

  await assertBoardAccess(db, userId, board);
}

/**
 * Assert a user can manage a board's membership: workspace admins always
 * can, otherwise the user must be a board admin themselves.
 */
export async function assertCanManageBoardMembers(
  db: dbClient,
  userId: string,
  board: { id: number; workspaceId: number },
): Promise<void> {
  const member = await permissionRepo.getMemberWithRole(
    db,
    userId,
    board.workspaceId,
  );

  if (!member) {
    throw new TRPCError({
      message: "You are not a member of this workspace",
      code: "FORBIDDEN",
    });
  }

  if (member.role === "admin") return;

  const membership = await boardMemberRepo.getMembership(db, {
    boardId: board.id,
    userId,
  });

  if (membership?.role === "admin") return;

  throw new TRPCError({
    message: "You do not have permission to manage members of this board",
    code: "FORBIDDEN",
  });
}
