import { t } from "@lingui/core/macro";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

export function CustomURLConfirmation({
  userId,
  workspacePublicId,
}: {
  userId: string;
  workspacePublicId: string;
}) {
  const { closeModal, entityId } = useModal();
  const { showPopup } = usePopup();

  const handleUpgrade = async () => {
    const { data, error } = await authClient.subscription.upgrade({
      plan: "pro",
      referenceId: workspacePublicId,
      metadata: { userId, workspacePublicId, workspaceSlug: entityId },
      successUrl: "/settings",
      cancelUrl: "/settings",
      returnUrl: "/settings",
      disableRedirect: true,
    });

    if (data?.url) {
      window.location.href = data.url;
    }

    if (error) {
      showPopup({
        header: t`Error upgrading subscription`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    }
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Confirm URL change`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {t`Custom URLs are a premium feature. You'll be directed to upgrade your account.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        <Button onClick={handleUpgrade}>{t`Upgrade`}</Button>
      </div>
    </div>
  );
}
