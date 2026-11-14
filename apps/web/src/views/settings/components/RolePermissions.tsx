import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useQueryClient } from "@tanstack/react-query";

import type { Permission, Role } from "@kan/shared";
import {
  getGetWorkspaceRolePermissionsQueryKey,
  useGetWorkspaceRolePermissions,
  useGrantRolePermission,
  useRevokeRolePermission,
} from "@kan/api-client/hooks";
import { permissionCategories, roles } from "@kan/shared";

import { useWorkspace } from "~/providers/workspace";
import { permissionCategoryLabel } from "~/utils/permission-category-label";

function formatRoleLabel(role: Role) {
  switch (role) {
    case "admin":
      return t`Admin`;
    case "member":
      return t`Member`;
    case "guest":
      return t`Guest`;
  }
}

const permissionLabels: Record<Permission, () => string> = {
  "workspace:view": () => t`Can view workspace`,
  "workspace:edit": () => t`Can edit workspace`,
  "workspace:delete": () => t`Can delete workspace`,
  "workspace:manage": () => t`Can manage workspace settings`,

  "board:view": () => t`Can view boards`,
  "board:create": () => t`Can create boards`,
  "board:edit": () => t`Can edit boards`,
  "board:delete": () => t`Can delete boards`,

  "list:view": () => t`Can view lists`,
  "list:create": () => t`Can create lists`,
  "list:edit": () => t`Can edit lists`,
  "list:delete": () => t`Can delete lists`,

  "card:view": () => t`Can view cards`,
  "card:create": () => t`Can create cards`,
  "card:edit": () => t`Can edit cards`,
  "card:delete": () => t`Can delete cards`,

  "comment:view": () => t`Can view comments`,
  "comment:create": () => t`Can add comments`,
  "comment:edit": () => t`Can edit comments`,
  "comment:delete": () => t`Can delete comments`,

  "member:view": () => t`Can view members`,
  "member:invite": () => t`Can invite members`,
  "member:edit": () => t`Can edit member roles and permissions`,
  "member:remove": () => t`Can remove members`,
};

export function RolePermissions() {
  useLingui();
  const { workspace } = useWorkspace();

  const queryClient = useQueryClient();

  const { data: result, isLoading } = useGetWorkspaceRolePermissions(
    workspace.publicId,
    { query: { enabled: !!workspace.publicId } },
  );
  const data = result?.data;

  const systemRoles = (data?.roles ?? []).filter((role) =>
    roles.includes(role.name as Role),
  );

  const orderedRoleNames: Role[] = ["admin", "member", "guest"].filter((role) =>
    systemRoles.some((r) => r.name === role),
  ) as Role[];

  const invalidateRolePermissions = () =>
    queryClient.invalidateQueries({
      queryKey: getGetWorkspaceRolePermissionsQueryKey(workspace.publicId),
    });

  const grantMutation = useGrantRolePermission({
    mutation: {
      onSettled: async () => {
        if (!workspace.publicId) return;
        await invalidateRolePermissions();
      },
    },
  });

  const revokeMutation = useRevokeRolePermission({
    mutation: {
      onSettled: async () => {
        if (!workspace.publicId) return;
        await invalidateRolePermissions();
      },
    },
  });

  const isBusy = grantMutation.isPending || revokeMutation.isPending;

  const handleToggle = (
    rolePublicId: string,
    permission: Permission,
    checked: boolean,
  ) => {
    if (!workspace.publicId || !rolePublicId) return;

    if (checked) {
      grantMutation.mutate({
        workspacePublicId: workspace.publicId,
        rolePublicId,
        data: { permission },
      });
    } else {
      revokeMutation.mutate({
        workspacePublicId: workspace.publicId,
        rolePublicId,
        data: { permission },
      });
    }
  };

  return (
    <div className="mt-2">
      {orderedRoleNames.length === 0 && !isLoading ? (
        <p className="mb-4 text-sm text-neutral-500 dark:text-dark-800">
          {t`No roles found for this workspace yet.`}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-100">
        <table className="min-w-full table-fixed divide-y divide-light-600 overflow-visible text-left text-sm dark:divide-dark-600">
          <thead className="rounded-t-lg bg-light-300 dark:bg-dark-300">
            <tr>
              <th className="w-1/2 rounded-tl-lg px-4 py-3 text-left text-xs font-semibold tracking-wide text-light-900 dark:text-dark-900">
                {t`Permission`}
              </th>
              {orderedRoleNames.map((role) => (
                <th
                  key={role}
                  className="w-1/6 px-4 py-3 text-center text-xs font-semibold tracking-wide text-light-900 dark:text-dark-900"
                >
                  {formatRoleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          {Object.values(permissionCategories).map((category) => (
            <tbody
              key={category.label}
              className="divide-y divide-light-600 overflow-visible bg-light-50 dark:divide-dark-600 dark:bg-dark-100"
            >
              <tr className="bg-light-100 dark:bg-dark-200">
                <td
                  colSpan={1 + orderedRoleNames.length}
                  className="px-4 py-2 text-xs font-semibold tracking-wide text-light-900 dark:text-dark-900"
                >
                  {permissionCategoryLabel(category.label)}
                </td>
              </tr>
              {category.permissions.map((permission) => (
                <tr key={permission}>
                  <td className="w-1/2 px-4 py-2 text-sm text-light-900 dark:text-dark-900">
                    {permissionLabels[permission]()}
                  </td>
                  {orderedRoleNames.map((roleName) => {
                    const role = systemRoles.find((r) => r.name === roleName);
                    const checked = role?.permissions.includes(permission);
                    const isAdminRole = roleName === "admin";
                    const isBillingOrDeletePermission =
                      permission === "workspace:manage" ||
                      permission === "workspace:delete";

                    return (
                      <td
                        key={roleName}
                        className="w-1/6 px-4 py-2 text-center align-middle"
                      >
                        <input
                          type="checkbox"
                          className="h-[16px] w-[16px] appearance-none rounded-md border border-light-500 bg-transparent outline-hidden ring-0 checked:bg-blue-600 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-hidden disabled:opacity-60 dark:border-dark-500 dark:hover:border-dark-500"
                          disabled={
                            isAdminRole ||
                            isBillingOrDeletePermission ||
                            !role ||
                            isLoading ||
                            isBusy
                          }
                          checked={!!checked}
                          onChange={(e) =>
                            !isAdminRole &&
                            !isBillingOrDeletePermission &&
                            role &&
                            handleToggle(
                              role.publicId,
                              permission,
                              e.target.checked,
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
