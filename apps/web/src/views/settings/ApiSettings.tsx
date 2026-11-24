import { t } from "@lingui/core/macro";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import ApiKeyList from "./components/ApiKeyList";
import NewApiKeyModal from "./components/NewApiKeyModal";
import { RevokeApiKeyConfirmation } from "./components/RevokeApiKeyConfirmation";
import { SettingsRow } from "./components/SettingsRow";

export default function ApiSettings() {
  const { modalContentType, openModal, isOpen } = useModal();

  return (
    <>
      <PageHead title={t`Settings | API`} />

      <div className="mb-8 py-3">
        <SettingsRow
          title={t`API keys`}
          description={t`View and manage your API keys.`}
        >
          <Button
            size="sm"
            onClick={() => openModal("NEW_API_KEY")}
          >{t`Create new key`}</Button>
        </SettingsRow>
        <ApiKeyList />
      </div>

      {/* API-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_API_KEY"}
      >
        <NewApiKeyModal />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "REVOKE_API_KEY"}
      >
        <RevokeApiKeyConfirmation />
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
