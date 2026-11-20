import { ForbiddenException, NotFoundException } from "@nestjs/common";

import type { dbClient } from "@kan/db/client";
import type { Permission, Role } from "@kan/shared";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import { canManageRole, getDefaultPermissions } from "@kan/shared";

export async function getMemberEffectivePermissions(
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
): Promise<Permission[]> {
  let roleDefaults: Set<Permission>;

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

export async function memberHasPermission(
  db: dbClient,
  workspaceMemberId: number,
  roleId: number | null,
  roleName: string,
  permission: Permission,
): Promise<boolean> {
  let hasRoleDefault: boolean;

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

  const override = await permissionRepo.getMemberPermissionOverride(
    db,
    workspaceMemberId,
    permission,
  );

  if (override) {
    return override.granted;
  }

  return hasRoleDefault;
}

export async function hasPermission(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
): Promise<boolean> {
  const member = await permissionRepo.getMemberWithRole(
    db,
    userId,
    workspaceId,
  );

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

export async function getUserPermissions(
  db: dbClient,
  userId: string,
  workspaceId: number,
): Promise<{
  permissions: Permission[];
  role: string;
  roleId: number | null;
} | null> {
  const member = await permissionRepo.getMemberWithRole(
    db,
    userId,
    workspaceId,
  );

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

export async function assertPermission(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
): Promise<void> {
  const hasIt = await hasPermission(db, userId, workspaceId, permission);

  if (!hasIt) {
    throw new ForbiddenException(
      `You do not have permission to perform this action (${permission})`,
    );
  }
}

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
    throw new ForbiddenException("You are not a member of this workspace");
  }

  const managerRole = managerMember.role;

  if (!canManageRole(managerRole, targetRoleName as Role)) {
    throw new ForbiddenException(
      `You cannot assign the "${targetRoleName}" role`,
    );
  }
}

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
    throw new ForbiddenException("You are not a member of this workspace");
  }

  const targetMember = await memberRepo.getById(db, targetMemberId);

  if (!targetMember) {
    throw new NotFoundException("Target member not found");
  }

  const managerRole = managerMember.role;
  const targetRole = targetMember.role;

  if (!canManageRole(managerRole, targetRole)) {
    throw new ForbiddenException(
      "You cannot manage this member due to role hierarchy",
    );
  }
}

export async function assertCanDelete(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
  createdBy: string | null,
): Promise<void> {
  const hasDeletePermission = await hasPermission(
    db,
    userId,
    workspaceId,
    permission,
  );

  if (hasDeletePermission) {
    return;
  }

  if (createdBy && createdBy === userId) {
    return;
  }

  throw new ForbiddenException(
    `You do not have permission to delete this entity (${permission})`,
  );
}

export async function assertCanEdit(
  db: dbClient,
  userId: string,
  workspaceId: number,
  permission: Permission,
  createdBy: string | null,
): Promise<void> {
  const hasEditPermission = await hasPermission(
    db,
    userId,
    workspaceId,
    permission,
  );

  if (hasEditPermission) {
    return;
  }

  if (createdBy && createdBy === userId) {
    return;
  }

  throw new ForbiddenException(
    `You do not have permission to edit this entity (${permission})`,
  );
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
 * Narrow workspace members to the ones who belong on a board's cards
 * (assignees, mentions): workspace admins and board members. Templates stay
 * open to the whole workspace.
 */
export async function filterBoardAssignable<
  T extends { id: number; role: string },
>(
  db: dbClient,
  board: { id: number; type: string },
  members: T[],
): Promise<T[]> {
  if (board.type !== "regular" || !members.length) return members;

  const onBoard = new Set(
    await boardMemberRepo.getWorkspaceMemberIds(db, board.id),
  );

  return members.filter(
    (member) => member.role === "admin" || onBoard.has(member.id),
  );
}

/**
 * Assert a user can see a board - throws NOT_FOUND (rather than FORBIDDEN)
 * since uninvited boards should be invisible, not merely inaccessible.
 *
 * "Public" boards are not open to the whole workspace: public only means
 * "viewable via the public share link" (board.bySlug), so non-members can't
 * see or edit them inside the app either.
 */
export async function assertBoardAccess(
  db: dbClient,
  userId: string,
  board: { id: number; workspaceId: number; type: string },
): Promise<void> {
  const allowed = await hasBoardAccess(db, userId, board);

  if (!allowed) {
    throw new NotFoundException(`Board not found`);
  }
}

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
    throw new ForbiddenException("You are not a member of this workspace");
  }

  if (member.role === "admin") return;

  const membership = await boardMemberRepo.getMembership(db, {
    boardId: board.id,
    userId,
  });

  if (membership?.role === "admin") return;

  throw new ForbiddenException(
    "You do not have permission to manage members of this board",
  );
}
