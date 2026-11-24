import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";

import {
  getGetWorkspaceQueryKey,
  useResetWorkspaceMemberPermissions,
} from "@kan/api-client/hooks";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { ClearCustomPermissionsConfirmation } from "./components/ClearCustomPermissionsConfirmation";
import { RolePermissions } from "./components/RolePermissions";
import { SettingsRow } from "./components/SettingsRow";

export default function PermissionsSettings() {
  const { workspace } = useWorkspace();
  const { openModal, isOpen, modalContentType } = useModal();
  const { showPopup } = usePopup();
  const queryClient = useQueryClient();

  const isAdmin = workspace.role === "admin";

  const resetAllOverrides = useResetWorkspaceMemberPermissions({
    mutation: {
      onSuccess: async () => {
        showPopup({
          header: t`Overrides cleared`,
          message: t`All member permission overrides have been reset to their role defaults.`,
          icon: "success",
        });

        if (workspace.publicId && workspace.publicId.length >= 12) {
          await queryClient.invalidateQueries({
            queryKey: getGetWorkspaceQueryKey(workspace.publicId),
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
  });

  return (
    <>
      <PageHead title={t`Settings | Permissions`} />

      <div className="mb-8 py-3">
        <SettingsRow
          title={t`Workspace permissions`}
          description={
            isAdmin
              ? t`Configure which actions are allowed for each workspace role. These permissions apply to all members with that role.`
              : t`You need to be an admin to manage workspace permissions.`
          }
        />
        {isAdmin && (
          <>
            <RolePermissions />
            <SettingsRow
              title={t`Custom permissions`}
              description={t`Clear any custom member permissions so that all members only inherit permissions from their role defaults.`}
            >
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
            </SettingsRow>
          </>
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
