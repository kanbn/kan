import { t } from "@lingui/core/macro";

import { useGetWorkspace } from "@kan/api-client/hooks";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { DeleteWorkspaceConfirmation } from "./components/DeleteWorkspaceConfirmation";
import { SettingsRow } from "./components/SettingsRow";
import UpdateWeekStartDayForm from "./components/UpdateWeekStartDayForm";
import UpdateWorkspaceDescriptionForm from "./components/UpdateWorkspaceDescriptionForm";
import UpdateWorkspaceEmailVisibilityForm from "./components/UpdateWorkspaceEmailVisibilityForm";
import UpdateWorkspaceNameForm from "./components/UpdateWorkspaceNameForm";
import UpdateWorkspaceUrlForm from "./components/UpdateWorkspaceUrlForm";

export default function WorkspaceSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();
  const { canEditWorkspace } = usePermissions();
  const { data: workspaceData } = useGetWorkspace(workspace.publicId, {
    query: {
      enabled: !!workspace.publicId && workspace.publicId.length >= 12,
      select: (res) => res.data,
    },
  });

  return (
    <>
      <PageHead title={t`Settings | Workspace`} />

      <div className="mb-8 divide-y divide-light-300 dark:divide-dark-200">
        <div className="py-3">
          <SettingsRow stacked title={t`Workspace name`}>
            <UpdateWorkspaceNameForm
              workspacePublicId={workspace.publicId}
              workspaceName={workspace.name}
              disabled={!canEditWorkspace}
            />
          </SettingsRow>
          <SettingsRow stacked title={t`Workspace URL`}>
            <UpdateWorkspaceUrlForm
              workspacePublicId={workspace.publicId}
              workspaceUrl={workspace.slug ?? ""}
              workspacePlan={workspace.plan ?? "free"}
              disabled={!canEditWorkspace}
            />
          </SettingsRow>
          <SettingsRow stacked title={t`Workspace description`}>
            <UpdateWorkspaceDescriptionForm
              workspacePublicId={workspace.publicId}
              workspaceDescription={workspace.description ?? ""}
              disabled={!canEditWorkspace}
            />
          </SettingsRow>
          <SettingsRow stacked title={t`Week start day`}>
            <UpdateWeekStartDayForm
              workspacePublicId={workspace.publicId}
              weekStartDay={workspaceData?.weekStartDay ?? 1}
              disabled={!canEditWorkspace}
            />
          </SettingsRow>
          <SettingsRow
            title={t`Email visibility`}
            description={t`Allow workspace members to see each other's email addresses`}
          >
            <UpdateWorkspaceEmailVisibilityForm
              workspacePublicId={workspace.publicId}
              showEmailsToMembers={Boolean(
                workspaceData?.showEmailsToMembers ?? false,
              )}
              disabled={!canEditWorkspace}
            />
          </SettingsRow>
        </div>
        <div className="py-3">
          <SettingsRow
            title={t`Delete workspace`}
            description={t`Once you delete your workspace, there is no going back. This action cannot be undone.`}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openModal("DELETE_WORKSPACE")}
              disabled={workspace.role !== "admin"}
            >
              {t`Delete workspace`}
            </Button>
          </SettingsRow>
        </div>
      </div>

      {/* Workspace-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_WORKSPACE"}
      >
        <DeleteWorkspaceConfirmation />
      </Modal>
      {/* Global modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
      >
        <FeedbackModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
      >
        <NewWorkspaceForm />
      </Modal>
    </>
  );
}
