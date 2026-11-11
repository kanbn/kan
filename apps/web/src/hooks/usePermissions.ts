import { useContext } from "react";

import type { Permission } from "@kan/shared";
import { useGetMyPermissions } from "@kan/api-client/hooks";

import { WorkspaceContext } from "~/providers/workspace";

interface UsePermissionsResult {
  permissions: Permission[];
  role: string | null;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  canViewCard: boolean;
  canCreateCard: boolean;
  canEditCard: boolean;
  canDeleteCard: boolean;
  canCreateList: boolean;
  canEditList: boolean;
  canDeleteList: boolean;
  canCreateBoard: boolean;
  canEditBoard: boolean;
  canDeleteBoard: boolean;
  canArchiveBoard: boolean;
  canViewComment: boolean;
  canCreateComment: boolean;
  canEditComment: boolean;
  canDeleteComment: boolean;
  canInviteMember: boolean;
  canEditMember: boolean;
  canRemoveMember: boolean;
  canViewWorkspace: boolean;
  canEditWorkspace: boolean;
}

export function usePermissions(): UsePermissionsResult {
  // Check if WorkspaceProvider is available (for public board views, it may not be)
  const workspaceContext = useContext(WorkspaceContext);
  const workspacePublicId = workspaceContext?.workspace.publicId ?? "";

  // Always call the hook (never conditionally) so hook order stays stable
  // across renders; `enabled` controls whether it actually fetches.
  const { data: result, isLoading } = useGetMyPermissions(workspacePublicId, {
    query: { enabled: !!workspaceContext && !!workspacePublicId },
  });

  // If WorkspaceProvider is not available, return safe defaults
  if (!workspaceContext) {
    const emptyPermissions: UsePermissionsResult = {
      permissions: [],
      role: null,
      isLoading: false,
      hasPermission: () => false,
      canViewCard: false,
      canCreateCard: false,
      canEditCard: false,
      canDeleteCard: false,
      canCreateList: false,
      canEditList: false,
      canDeleteList: false,
      canCreateBoard: false,
      canEditBoard: false,
      canDeleteBoard: false,
      canArchiveBoard: false,
      canViewComment: false,
      canCreateComment: false,
      canEditComment: false,
      canDeleteComment: false,
      canInviteMember: false,
      canEditMember: false,
      canRemoveMember: false,
      canViewWorkspace: false,
      canEditWorkspace: false,
    };
    return emptyPermissions;
  }

  const permissions = (result?.data.permissions ?? []) as Permission[];
  const role = result?.data.role ?? null;

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  return {
    permissions,
    role,
    isLoading,
    hasPermission,
    canViewCard: hasPermission("card:view"),
    canCreateCard: hasPermission("card:create"),
    canEditCard: hasPermission("card:edit"),
    canDeleteCard: hasPermission("card:delete"),
    canCreateList: hasPermission("list:create"),
    canEditList: hasPermission("list:edit"),
    canDeleteList: hasPermission("list:delete"),
    canCreateBoard: hasPermission("board:create"),
    canEditBoard: hasPermission("board:edit"),
    canDeleteBoard: hasPermission("board:delete"),
    canArchiveBoard: hasPermission("board:edit"),
    canViewComment: hasPermission("comment:view"),
    canCreateComment: hasPermission("comment:create"),
    canEditComment: hasPermission("comment:edit"),
    canDeleteComment: hasPermission("comment:delete"),
    canInviteMember: hasPermission("member:invite"),
    canEditMember: hasPermission("member:edit"),
    canRemoveMember: hasPermission("member:remove"),
    canViewWorkspace: hasPermission("workspace:view"),
    canEditWorkspace: hasPermission("workspace:edit"),
  };
}
