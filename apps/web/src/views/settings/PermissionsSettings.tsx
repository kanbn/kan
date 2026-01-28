import { t } from "@lingui/core/macro";

import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";
import { RolePermissions } from "./components/RolePermissions";

export default function PermissionsSettings() {
  const { workspace } = useWorkspace();

  const isAdmin = workspace.role === "admin";

  return (
    <>
      <PageHead title={t`Settings | Permissions`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace permissions`}
        </h2>
        <p className="mb-6 text-sm text-neutral-500 dark:text-dark-900">
          {t`Configure which actions are allowed for each workspace role. These permissions apply to all members with that role.`}
        </p>

        {isAdmin ? (
          <RolePermissions />
        ) : (
          <p className="mt-4 text-sm text-neutral-500 dark:text-dark-900">
            {t`You need to be an admin to manage workspace permissions.`}
          </p>
        )}
      </div>
    </>
  );
}


