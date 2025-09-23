import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import { LanguageSelector } from "~/components/LanguageSelector";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import Avatar from "./components/Avatar";
import { ChangePasswordFormConfirmation } from "./components/ChangePasswordConfirmation";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";

export default function AccountSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const isCredentialsEnabled =
    env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
  const { data } = api.user.getUser.useQuery();

  return (
    <>
      <PageHead title={t`Settings | Account`} />

      <div className="mb-8 border-t border-light-300 dark:border-dark-300">
        <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
          {t`Profile picture`}
        </h2>
        <Avatar userId={data?.id} userImage={data?.image} />

        <div className="mb-4">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Display name`}
          </h2>
          <UpdateDisplayNameForm displayName={data?.name ?? ""} />
        </div>

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Language`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Change your language preferences.`}
          </p>
          <LanguageSelector />
        </div>

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Delete account`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Once you delete your account, there is no going back. This action cannot be undone.`}
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_ACCOUNT")}
            >
              {t`Delete account`}
            </Button>
          </div>
        </div>

        {isCredentialsEnabled && (
          <div className="mb-8 border-t border-light-300 dark:border-dark-300">
            <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
              {t`Change Password`}
            </h2>
            <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
              {t`You are about to change your password.`}
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => openModal("CHANGE_PASSWORD")}
              >
                {t`Change Password`}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Account-specific modals */}
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_ACCOUNT"}
      >
        <DeleteAccountConfirmation />
      </Modal>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "CHANGE_PASSWORD"}
      >
        <ChangePasswordFormConfirmation />
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
