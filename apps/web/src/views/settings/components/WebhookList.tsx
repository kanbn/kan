import type { Locale as DateFnsLocale } from "date-fns";
import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useGetWebhooks, useTestWebhook } from "@kan/api-client/hooks";

import Dropdown from "~/components/Dropdown";
import { useLocalisation } from "~/hooks/useLocalisation";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";

interface TableRowProps {
  name?: string;
  url?: string;
  events?: string[];
  active?: boolean;
  createdAt?: string | null;
  dateLocale?: DateFnsLocale;
  showSkeleton?: boolean;
  onEdit?: () => void;
  onTest?: () => void;
  onDelete?: () => void;
}

function formatEvents(events: string[]) {
  return events.map((e) => e.replace("card.", "")).join(", ");
}

function formatDate(date?: string | null, locale?: DateFnsLocale) {
  if (!date) return "Never";
  return format(new Date(date), "MMM d, yyyy", { locale });
}

function TableRow({
  name,
  url,
  events,
  active,
  createdAt,
  dateLocale,
  showSkeleton,
  onEdit,
  onTest,
  onDelete,
}: TableRowProps) {
  return (
    <tr className="group/row h-12 transition-colors hover:bg-light-200 dark:hover:bg-dark-100">
      <td className="w-[25%] whitespace-nowrap">
        <div className="flex items-center px-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center">
              <p
                className={twMerge(
                  "mr-2 text-sm font-medium text-neutral-900 dark:text-dark-1000",
                  showSkeleton &&
                    "mb-2 h-3 w-[125px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
                )}
              >
                {name}
              </p>
            </div>
          </div>
        </div>
      </td>
      <td className="w-[30%] max-w-0 px-2">
        <p
          className={twMerge(
            "truncate text-xs text-light-900 dark:text-dark-900",
            showSkeleton &&
              "h-3 w-[180px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
          )}
          title={url}
        >
          {url}
        </p>
      </td>
      <td className="w-[20%] px-2 whitespace-nowrap">
        <p
          className={twMerge(
            "text-xs text-light-900 dark:text-dark-900",
            showSkeleton &&
              "h-3 w-[100px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
          )}
        >
          {events && formatEvents(events)}
        </p>
      </td>
      <td className="w-[10%] px-2 whitespace-nowrap">
        <span
          className={twMerge(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px]",
            active
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-light-300 text-light-950 dark:bg-dark-200 dark:text-dark-900",
            showSkeleton &&
              "h-5 w-[50px] animate-pulse bg-light-200 dark:bg-dark-200",
          )}
        >
          {!showSkeleton && (active ? t`Active` : t`Inactive`)}
        </span>
      </td>
      <td className="w-[10%] px-2 whitespace-nowrap">
        <p
          className={twMerge(
            "text-xs text-light-900 dark:text-dark-900",
            showSkeleton &&
              "h-3 w-[80px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
          )}
        >
          {formatDate(createdAt, dateLocale)}
        </p>
      </td>
      <td className="w-[5%] min-w-[40px]">
        {!showSkeleton && (
          <div className="flex w-full items-center justify-end px-2">
            <div className="relative transition-opacity md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100">
              <Dropdown
                ariaLabel={t`Webhook options`}
                buttonClassName="h-6 w-6 hover:bg-light-400 dark:hover:bg-dark-300"
                items={[
                  {
                    label: t`Edit`,
                    action: () => onEdit?.(),
                  },
                  {
                    label: t`Test`,
                    action: () => onTest?.(),
                  },
                  {
                    label: t`Delete`,
                    action: () => onDelete?.(),
                  },
                ]}
              >
                <HiEllipsisHorizontal
                  size={16}
                  className="text-light-900 dark:text-dark-900"
                />
              </Dropdown>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

interface WebhookListProps {
  workspacePublicId: string;
}

export default function WebhookList({ workspacePublicId }: WebhookListProps) {
  const { openModal, setModalState } = useModal();
  const { showPopup } = usePopup();
  const { dateLocale } = useLocalisation();

  const { data: webhooks, isLoading } = useGetWebhooks(workspacePublicId, {
    query: { select: (res) => res.data },
  });

  const testWebhookMutation = useTestWebhook({
    mutation: {
      onSuccess: ({ data: result }) => {
        if (result.success) {
          showPopup({
            header: t`Test sent`,
            message: t`Test webhook sent successfully!`,
            icon: "success",
          });
        } else {
          showPopup({
            header: t`Test failed`,
            message: result.error || t`Webhook test failed`,
            icon: "error",
          });
        }
      },
      onError: (error) => {
        showPopup({
          header: t`Unable to test webhook`,
          message:
            (error instanceof Error && error.message) ||
            t`Failed to test webhook`,
          icon: "error",
        });
      },
    },
  });

  if (!isLoading && (!webhooks || webhooks.length === 0)) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-neutral-500 dark:text-dark-900">
          {t`No webhooks configured. Add a webhook to receive notifications.`}
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-2 mt-4 flow-root">
      <div className="overflow-x-auto overflow-y-visible">
        <div className="inline-block min-w-full py-2 pb-32 align-middle">
          <div className="relative h-full">
            <table className="w-full min-w-[700px]">
              <thead className="border-b border-light-400 dark:border-dark-300">
                <tr>
                  <th
                    scope="col"
                    className="w-[25%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    {t`Name`}
                  </th>
                  <th
                    scope="col"
                    className="w-[30%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    {t`URL`}
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    {t`Events`}
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    {t`Status`}
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    {t`Created`}
                  </th>
                  <th
                    scope="col"
                    className="w-[5%] px-2 pb-2 text-center text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    {/* Actions column */}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-300 dark:divide-dark-200">
                {!isLoading &&
                  webhooks?.map((webhook) => (
                    <TableRow
                      key={webhook.publicId}
                      name={webhook.name}
                      url={webhook.url}
                      events={webhook.events}
                      active={webhook.active}
                      createdAt={webhook.createdAt}
                      dateLocale={dateLocale}
                      onEdit={() => {
                        setModalState("EDIT_WEBHOOK", {
                          publicId: webhook.publicId,
                          name: webhook.name,
                          url: webhook.url,
                          events: webhook.events,
                          active: webhook.active,
                        });
                        openModal(
                          "EDIT_WEBHOOK",
                          webhook.publicId,
                          webhook.name,
                        );
                      }}
                      onTest={() => {
                        testWebhookMutation.mutate({
                          workspacePublicId,
                          webhookPublicId: webhook.publicId,
                        });
                      }}
                      onDelete={() => {
                        openModal(
                          "DELETE_WEBHOOK",
                          webhook.publicId,
                          webhook.name,
                        );
                      }}
                    />
                  ))}

                {isLoading && (
                  <>
                    <TableRow showSkeleton />
                    <TableRow showSkeleton />
                    <TableRow showSkeleton />
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
