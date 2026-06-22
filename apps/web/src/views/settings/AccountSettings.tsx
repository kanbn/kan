import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";

import Button from "~/components/Button";
import FeedbackModal from "~/components/FeedbackModal";
import { FontSizeSelector } from "~/components/FontSizeSelector";
import { LanguageSelector } from "~/components/LanguageSelector";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { usePushSubscription } from "~/hooks/usePushSubscription";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import Avatar from "./components/Avatar";
import { ChangePasswordFormConfirmation } from "./components/ChangePasswordConfirmation";
import { DeleteAccountConfirmation } from "./components/DeleteAccountConfirmation";
import UpdateDisplayNameForm from "./components/UpdateDisplayNameForm";

const NotificationsToggle = () => {
  if (typeof window === "undefined") return null;
  const { subscribed, subscribe, unsubscribe } = usePushSubscription();
  const sendTestPush = api.notification.sendTestPush.useMutation<unknown>();
  const isOn = subscribed === true;

  if (!("serviceWorker" in navigator)) return null;

  return (
    <>
      <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
        {t`Get desktop notifications for mentions, comments, and board updates.`}
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          variant={isOn ? "secondary" : "primary"}
          onClick={() => (isOn ? unsubscribe() : subscribe())}
          isLoading={subscribed === undefined}
        >
          {isOn ? t`Disable notifications` : t`Enable notifications`}
        </Button>
        {isOn && (
          <Button
            variant="secondary"
            onClick={() => sendTestPush.mutate()}
            isLoading={sendTestPush.isPending}
          >
            {t`Send test notification`}
          </Button>
        )}
      </div>
    </>
  );
};

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

        <div className="mb-4">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Email`}
          </h2>
          <p className="text-sm text-neutral-700 dark:text-dark-900">
            {data?.email}
          </p>
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
            {t`Notifications`}
          </h2>
          <NotificationsToggle />
        </div>

        <div className="mb-8 border-t border-light-300 dark:border-dark-300">
          <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
            {t`Font size`}
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Change the application font size.`}
          </p>
          <FontSizeSelector />
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
              {data?.hasPassword ? t`Change Password` : t`Set Password`}
            </h2>
            <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
              {data?.hasPassword
                ? t`You are about to change your password.`
                : t`Set a password to enable password-based login.`}
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => openModal("CHANGE_PASSWORD")}
              >
                {data?.hasPassword ? t`Change Password` : t`Set Password`}
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
