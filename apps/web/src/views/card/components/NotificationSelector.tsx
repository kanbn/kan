import { t } from "@lingui/core/macro";
import { HiBellAlert, HiMiniPlus, HiXMark } from "react-icons/hi2";

import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface NotificationRow {
  publicId: string;
  channel: "mattermost" | "google_calendar";
  triggerType: "relative" | "absolute";
  offsetValue: number | null;
  offsetUnit: "minutes" | "hours" | "days" | null;
  triggerAt: Date | null;
  timeOfDay: string;
}

interface NotificationSelectorProps {
  cardPublicId: string;
  isLoading: boolean;
  disabled?: boolean;
}

function channelLabel(channel: NotificationRow["channel"]): string {
  return channel === "mattermost" ? t`Mattermost` : t`Google Calendar`;
}

function triggerLabel(n: NotificationRow): string {
  if (n.triggerType === "relative") {
    const value = n.offsetValue ?? 1;
    const unit =
      n.offsetUnit === "minutes"
        ? t`minute(s)`
        : n.offsetUnit === "hours"
          ? t`hour(s)`
          : t`day(s)`;
    return t`${value} ${unit} before`;
  }
  return n.triggerAt
    ? new Date(n.triggerAt).toLocaleDateString()
    : t`Specific date`;
}

export default function NotificationSelector({
  cardPublicId,
  isLoading,
  disabled = false,
}: NotificationSelectorProps) {
  const utils = api.useUtils();
  const { openModal } = useModal();
  const { showPopup } = usePopup();

  const { data: notifications, isLoading: notificationsLoading } =
    api.cardNotification.list.useQuery(
      { cardPublicId },
      { enabled: !!cardPublicId && cardPublicId.length >= 12 },
    );

  const deleteNotification = api.cardNotification.delete.useMutation({
    onMutate: async ({ notificationPublicId }) => {
      await utils.cardNotification.list.cancel({ cardPublicId });
      const previous = utils.cardNotification.list.getData({ cardPublicId });
      utils.cardNotification.list.setData({ cardPublicId }, (old) =>
        old ? old.filter((n) => n.publicId !== notificationPublicId) : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        utils.cardNotification.list.setData({ cardPublicId }, context.previous);
      }
      showPopup({
        header: t`Unable to remove notification`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.cardNotification.list.invalidate({ cardPublicId });
    },
  });

  const loading = isLoading || notificationsLoading;
  const rows = notifications ?? [];

  if (loading) {
    return (
      <div className="flex w-full">
        <div className="h-full w-[175px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
      </div>
    );
  }

  if (rows.length === 0) {
    if (disabled) {
      return (
        <div className="flex h-full w-full items-center rounded-[5px] pl-1 text-left text-sm text-light-700 dark:text-dark-700">
          {t`None`}
        </div>
      );
    }
    return (
      <div className="flex w-full items-center text-left">
        <button
          type="button"
          onClick={() => openModal("CARD_NOTIFICATION", cardPublicId)}
          className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100"
        >
          <HiMiniPlus size={22} className="pr-2" />
          {t`Add notification`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      {rows.map((n) => (
        <div
          key={n.publicId}
          className="flex items-start gap-1 rounded-[5px] border-[1px] border-light-50 px-2 py-1 dark:border-dark-50"
        >
          <HiBellAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-light-700 dark:text-dark-700" />
          <span className="min-w-0 flex-1 text-sm text-neutral-900 dark:text-dark-1000">
            <span className="font-medium">{channelLabel(n.channel)}</span>
            <span>
              {" · "}
              {triggerLabel(n)}
              {" · "}
              {n.timeOfDay}
            </span>
          </span>
          {!disabled && (
            <button
              type="button"
              aria-label={t`Remove notification`}
              disabled={deleteNotification.isPending}
              onClick={() =>
                deleteNotification.mutate({
                  cardPublicId,
                  notificationPublicId: n.publicId,
                })
              }
              className="shrink-0 rounded p-0.5 text-light-700 hover:bg-light-200 hover:text-light-900 dark:text-dark-700 dark:hover:bg-dark-200 dark:hover:text-dark-900"
            >
              <HiXMark className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <div className="mt-1 flex w-full items-center text-left">
          <button
            type="button"
            onClick={() => openModal("CARD_NOTIFICATION", cardPublicId)}
            className="flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 hover:border-light-300 hover:bg-light-200 dark:border-dark-50 dark:text-dark-1000 dark:hover:border-dark-200 dark:hover:bg-dark-100"
          >
            <HiMiniPlus size={22} className="pr-2" />
            {t`Add notification`}
          </button>
        </div>
      )}
    </div>
  );
}
