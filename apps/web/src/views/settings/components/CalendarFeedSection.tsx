import { t } from "@lingui/core/macro";
import { useState } from "react";
import {
  HiInformationCircle,
  HiMiniCheck,
  HiOutlineDocumentDuplicate,
} from "react-icons/hi2";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useClipboard } from "~/hooks/useClipboard";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function CalendarFeedSection() {
  const { showPopup } = usePopup();
  const { copied, copy } = useClipboard({ timeout: 2000 });
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const { data, refetch } = api.user.getCalendarFeedUrl.useQuery();
  const url = data?.url ?? null;

  const { mutateAsync: regenerate, isPending } =
    api.user.regenerateCalendarToken.useMutation({
      onSuccess: () => {
        void refetch();
        setConfirmingRegenerate(false);
        showPopup({
          header: t`Calendar link ready`,
          message: t`Your calendar link has been generated. Add it to Google Calendar to sync your due dates.`,
          icon: "success",
        });
      },
      onError: () => {
        showPopup({
          header: t`Couldn't update calendar link`,
          message: t`Please try again later, or contact customer support.`,
          icon: "error",
        });
      },
    });

  return (
    <div className="mb-8 border-t border-light-300 dark:border-dark-300">
      <h2 className="mb-4 mt-8 text-[14px] font-bold text-neutral-900 dark:text-dark-1000">
        {t`Calendar`}
      </h2>

      {url === null ? (
        <>
          <p className="mb-8 text-sm text-neutral-500 dark:text-dark-900">
            {t`Sync your tasks' due dates to Google Calendar (or any calendar app) using a private link.`}
          </p>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={() => void regenerate()}
          >
            {t`Generate calendar link`}
          </Button>
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-neutral-500 dark:text-dark-900">
            {t`In Google Calendar, go to Settings → Add calendar → From URL and paste this link. Your assigned tasks with due dates appear automatically.`}
          </p>
          <div className="mb-4 max-w-[460px]">
            <div className="relative">
              <Input
                value={url}
                className="pr-10 text-sm text-light-900 dark:text-dark-900"
                readOnly
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-light-900 hover:text-light-950 dark:text-dark-900 dark:hover:text-dark-950"
                onClick={() => copy(url)}
                aria-label={t`Copy calendar link`}
              >
                {copied ? (
                  <HiMiniCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <HiOutlineDocumentDuplicate className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="mt-2 flex items-start gap-1">
              <HiInformationCircle className="mt-0.5 h-4 w-4 text-dark-900" />
              <p className="text-xs text-gray-500 dark:text-dark-900">
                {t`Anyone with this link can view your assigned tasks. Regenerating the link invalidates the previous one.`}
              </p>
            </div>
          </div>

          {confirmingRegenerate ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                isLoading={isPending}
                onClick={() => void regenerate()}
              >
                {t`Confirm regenerate`}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmingRegenerate(false)}
              >
                {t`Cancel`}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setConfirmingRegenerate(true)}
            >
              {t`Regenerate`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
