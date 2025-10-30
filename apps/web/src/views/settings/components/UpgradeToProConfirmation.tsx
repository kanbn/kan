import { t } from "@lingui/core/macro";
import { HiBolt, HiCheckBadge } from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

export function UpgradeToProConfirmation({
  workspacePublicId,
}: {
  userId: string;
  workspacePublicId: string;
}) {
  const { closeModal, entityId } = useModal();
  const { showPopup } = usePopup();

  const handleUpgrade = async () => {
    try {
      const response = await fetch("/api/stripe/create_checkout_session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(entityId && { slug: entityId }),
          workspacePublicId: workspacePublicId,
          cancelUrl: "/settings",
          successUrl: "/settings",
        }),
      });

      const { url } = (await response.json()) as { url: string };

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);

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
        <div className="pb-4">
          <h2 className="text-md font-bold text-neutral-900 dark:text-dark-1000">
            {t`Upgrade to Pro`}
          </h2>
        </div>
        <p className="mb-4 text-sm font-medium text-light-900 dark:text-dark-900">
          {t`Supercharge your workspace for just $29/month. Here's what you'll get:`}
        </p>

        <div className="rounded-md bg-light-100 p-3 text-xs text-light-900 dark:bg-dark-200 dark:text-dark-900">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <HiCheckBadge className="h-5 w-5 flex-shrink-0 text-light-1000 dark:text-dark-950" />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-neutral-900 dark:text-dark-1000">
                  {t`Unlimited members`}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400 sm:text-[10px]">
                  {t`Launch offer`}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <HiCheckBadge className="h-5 w-5 flex-shrink-0 text-light-1000 dark:text-dark-950" />
              <span className="text-sm text-neutral-900 dark:text-dark-1000">
                {t`Custom workspace URL`}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <HiCheckBadge className="h-5 w-5 flex-shrink-0 text-light-1000 dark:text-dark-950" />
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-900 dark:text-dark-1000">
                  {t`Board analytics`}
                </span>
                <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:text-gray-400 sm:text-[10px]">
                  {t`Coming soon`}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <HiCheckBadge className="h-5 w-5 flex-shrink-0 text-light-1000 dark:text-dark-950" />
              <span className="text-sm text-neutral-900 dark:text-dark-1000">
                {t`Priority email support`}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button
          onClick={() => {
            closeModal();
          }}
          variant="secondary"
        >
          {t`Cancel`}
        </Button>
        <Button
          onClick={handleUpgrade}
          iconRight={<HiBolt />}
        >{t`Start 14 day free trial`}</Button>
      </div>
    </div>
  );
}
