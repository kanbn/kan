import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { DeleteWebhookConfirmation } from "./components/DeleteWebhookConfirmation";
import { NewWebhookModal } from "./components/NewWebhookModal";
import { SettingsRow } from "./components/SettingsRow";
import WebhookList from "./components/WebhookList";

export default function WebhookSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const { workspace } = useWorkspace();

  return (
    <>
      <PageHead title={t`Settings | Webhooks`} />

      <div className="mb-8 py-3">
        <SettingsRow
          title={t`Webhooks`}
          description={t`Configure webhooks to receive notifications when cards are created, updated, moved, or deleted.`}
        >
          <Button
            size="sm"
            onClick={() => openModal("NEW_WEBHOOK")}
          >{t`Add webhook`}</Button>
        </SettingsRow>
        <WebhookList workspacePublicId={workspace.publicId} />
      </div>

      {/* Webhook-specific modals */}
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "NEW_WEBHOOK"}
      >
        <NewWebhookModal workspacePublicId={workspace.publicId} />
      </Modal>
      <Modal
        modalSize="md"
        isVisible={isOpen && modalContentType === "EDIT_WEBHOOK"}
      >
        <NewWebhookModal workspacePublicId={workspace.publicId} isEdit />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_WEBHOOK"}
      >
        <DeleteWebhookConfirmation workspacePublicId={workspace.publicId} />
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
