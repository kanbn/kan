import { t } from "@lingui/core/macro";

import { PageHead } from "~/components/PageHead";
import Button from "~/components/Button";
import Modal from "~/components/modal";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { ClearCustomPermissionsConfirmation } from "./components/ClearCustomPermissionsConfirmation";
import { RolePermissions } from "./components/RolePermissions";

export default function PermissionsSettings() {
  const { workspace } = useWorkspace();
  const { openModal, isOpen, modalContentType } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const isAdmin = workspace.role === "admin";

  const resetAllOverrides = api.permission.resetWorkspaceMemberPermissions.useMutation(
    {
      onSuccess: async () => {
        showPopup({
          header: t`Overrides cleared`,
          message: t`All member permission overrides have been reset to their role defaults.`,
          icon: "success",
        });

        // Refresh any relevant workspace data
        if (workspace.publicId && workspace.publicId.length >= 12) {
          await utils.workspace.byId.invalidate({
            workspacePublicId: workspace.publicId,
          });
        }
      },
      onError: () => {
        showPopup({
          header: t`Unable to clear overrides`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
    },
  );

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
          <>
            <RolePermissions />
            <div className="mt-8">
              <h2 className="mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
                {t`Custom permissions`}
              </h2>
              <p className="mb-6 text-sm text-neutral-500 dark:text-dark-900">
                {t`Clear any custom member permissions so that all members only inherit permissions from their role defaults.`}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!workspace.publicId || resetAllOverrides.isPending) {
                    return;
                  }
                  openModal("CLEAR_CUSTOM_PERMISSIONS");
                }}
                disabled={resetAllOverrides.isPending}
              >
                {t`Clear custom permissions`}
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-neutral-500 dark:text-dark-900">
            {t`You need to be an admin to manage workspace permissions.`}
          </p>
        )}
      </div>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "CLEAR_CUSTOM_PERMISSIONS"}
      >
        <ClearCustomPermissionsConfirmation
          resetAllOverrides={resetAllOverrides}
        />
      </Modal>
    </>
  );
}


