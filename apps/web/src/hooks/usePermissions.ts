import type { Permission } from "@kan/shared";

import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

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
  const { workspace } = useWorkspace();

  const { data, isLoading } = api.permission.getMyPermissions.useQuery(
    { workspacePublicId: workspace.publicId },
    {
      enabled: !!workspace.publicId,
    },
  );

  const permissions = (data?.permissions ?? []) as Permission[];
  const role = data?.role ?? null;

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

