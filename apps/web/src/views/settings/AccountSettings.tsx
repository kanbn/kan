import { t } from "@lingui/core/macro";

import { useGetUser } from "@kan/api-client/hooks";
import { env } from "@kan/shared/env";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import { FontSizeSelector } from "~/components/FontSizeSelector";
import { LanguageSelector } from "~/components/LanguageSelector";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { useModal } from "~/providers/modal";
import Avatar from "./components/Avatar";
import { ChangePasswordFormConfirmation } from "./components/ChangePasswordConfirmation";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import { SettingsRow } from "./components/SettingsRow";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";

export default function AccountSettings() {
  const { modalContentType, openModal, isOpen } = useModal();
  const isCredentialsEnabled =
    env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
  const { data } = useGetUser({
    query: { select: (res) => res.data },
  });

  return (
    <>
      <PageHead title={t`Settings | Account`} />

      <div className="mb-8 divide-y divide-light-300 dark:divide-dark-200">
        <div className="py-3">
          <SettingsRow stacked title={t`Profile picture`}>
            <Avatar userId={data?.id} userImage={data?.image} />
          </SettingsRow>
          <SettingsRow stacked title={t`Display name`}>
            <UpdateDisplayNameForm displayName={data?.name ?? ""} />
          </SettingsRow>
          <SettingsRow stacked title={t`Email`}>
            <p className="truncate text-sm text-light-950 dark:text-dark-950">
              {data?.email}
            </p>
          </SettingsRow>
        </div>
        <div className="py-3">
          <SettingsRow
            stacked
            title={t`Language`}
            description={t`Change your language preferences.`}
          >
            <LanguageSelector />
          </SettingsRow>
          <SettingsRow
            stacked
            title={t`Font size`}
            description={t`Change the application font size.`}
          >
            <FontSizeSelector />
          </SettingsRow>
        </div>
        {isCredentialsEnabled && (
          <div className="py-3">
            <SettingsRow
              title={data?.hasPassword ? t`Change Password` : t`Set Password`}
              description={
                data?.hasPassword
                  ? t`You are about to change your password.`
                  : t`Set a password to enable password-based login.`
              }
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openModal("CHANGE_PASSWORD")}
              >
                {data?.hasPassword ? t`Change Password` : t`Set Password`}
              </Button>
            </SettingsRow>
          </div>
        )}
        <div className="py-3">
          <SettingsRow
            title={t`Delete account`}
            description={t`Once you delete your account, there is no going back. This action cannot be undone.`}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openModal("DELETE_ACCOUNT")}
            >
              {t`Delete account`}
            </Button>
          </SettingsRow>
        </div>
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
        <ChangePasswordFormConfirmation
          hasPassword={data?.hasPassword ?? false}
        />
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
