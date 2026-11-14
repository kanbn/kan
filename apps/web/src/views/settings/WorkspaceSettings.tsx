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

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace name`}
        </h2>
        <UpdateWorkspaceNameForm
          workspacePublicId={workspace.publicId}
          workspaceName={workspace.name}
          disabled={!canEditWorkspace}
        />

        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace URL`}
        </h2>
        <UpdateWorkspaceUrlForm
          workspacePublicId={workspace.publicId}
          workspaceUrl={workspace.slug ?? ""}
          workspacePlan={workspace.plan ?? "free"}
          disabled={!canEditWorkspace}
        />

        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Workspace description`}
        </h2>
        <UpdateWorkspaceDescriptionForm
          workspacePublicId={workspace.publicId}
          workspaceDescription={workspace.description ?? ""}
          disabled={!canEditWorkspace}
        />

        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Week start day`}
        </h2>
        <UpdateWeekStartDayForm
          workspacePublicId={workspace.publicId}
          weekStartDay={workspaceData?.weekStartDay ?? 1}
          disabled={!canEditWorkspace}
        />

        <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Email visibility`}
        </h2>
        <UpdateWorkspaceEmailVisibilityForm
          workspacePublicId={workspace.publicId}
          showEmailsToMembers={Boolean(
            workspaceData?.showEmailsToMembers ?? false,
          )}
          disabled={!canEditWorkspace}
        />

        <div className="border-t border-light-300 dark:border-dark-300">
          <h2 className="mt-8 mb-4 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Delete workspace`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Once you delete your workspace, there is no going back. This action cannot be undone.`}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_WORKSPACE")}
              disabled={workspace.role !== "admin"}
            >
              {t`Delete workspace`}
            </Button>
          </div>
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
