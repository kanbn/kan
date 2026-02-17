import { t } from "@lingui/core/macro";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface TableRowProps {
  publicId?: string;
  name?: string;
  url?: string;
  events?: string[];
  active?: boolean;
  createdAt?: Date | null;
  isLastRow?: boolean;
  showSkeleton?: boolean;
  onEdit?: () => void;
  onTest?: () => void;
  onDelete?: () => void;
}

function formatEvents(events: string[]) {
  return events
    .map((e) => e.replace("card.", ""))
    .join(", ");
}

function formatDate(date?: Date | null) {
  if (!date) return "Never";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TableRow({
  publicId,
  name,
  url,
  events,
  active,
  createdAt,
  isLastRow,
  showSkeleton,
  onEdit,
  onTest,
  onDelete,
}: TableRowProps) {
  return (
    <tr className="rounded-b-lg">
      <td className={twMerge("w-[25%]", isLastRow ? "rounded-bl-lg" : "")}>
        <div className="flex items-center p-4">
          <div className="ml-2 min-w-0 flex-1">
            <div className="flex items-center">
              <p
                className={twMerge(
                  "mr-2 text-sm font-medium text-light-900 dark:text-dark-900",
                  showSkeleton &&
                    "mb-2 h-3 w-[125px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                )}
              >
                {name}
              </p>
            </div>
          </div>
        </div>
      </td>
      <td className="w-[30%] px-3 py-4">
        <p
          className={twMerge(
            "truncate text-sm text-light-900 dark:text-dark-900",
            showSkeleton &&
              "h-3 w-[180px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
          )}
          title={url}
        >
          {url}
        </p>
      </td>
      <td className="w-[20%] px-3 py-4">
        <p
          className={twMerge(
            "text-sm text-light-900 dark:text-dark-900",
            showSkeleton &&
              "h-3 w-[100px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
          )}
        >
          {events && formatEvents(events)}
        </p>
      </td>
      <td className="w-[10%] px-3 py-4">
        <span
          className={twMerge(
            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
            active
              ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              : "bg-gray-500/10 text-gray-400 ring-gray-500/20",
            showSkeleton &&
              "h-5 w-[50px] animate-pulse bg-light-200 ring-0 dark:bg-dark-200",
          )}
        >
          {!showSkeleton && (active ? t`Active` : t`Inactive`)}
        </span>
      </td>
      <td className="w-[10%] px-3 py-4">
        <p
          className={twMerge(
            "text-sm text-light-900 dark:text-dark-900",
            showSkeleton &&
              "h-3 w-[80px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
          )}
        >
          {formatDate(createdAt)}
        </p>
      </td>
      <td
        className={twMerge(
          "w-[5%] min-w-[50px]",
          isLastRow && "rounded-br-lg",
        )}
      >
        {!showSkeleton && (
          <div className="flex w-full items-center justify-center px-3">
            <div className="relative z-50">
              <Dropdown
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
                  size={25}
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

  const { data: webhooks, isLoading } = api.webhook.list.useQuery({
    workspacePublicId,
  });

  const testWebhookMutation = api.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        showPopup({ message: t`Test webhook sent successfully!`, type: "success" });
      } else {
        showPopup({
          message: result.error || t`Webhook test failed`,
          type: "error",
        });
      }
    },
    onError: (error) => {
      showPopup({
        message: error.message || t`Failed to test webhook`,
        type: "error",
      });
    },
  });

  if (!isLoading && (!webhooks || webhooks.length === 0)) {
    return (
      <div className="rounded-lg border border-light-300 bg-light-50 p-8 text-center dark:border-dark-300 dark:bg-dark-100">
        <p className="text-sm text-neutral-500 dark:text-dark-900">
          {t`No webhooks configured. Add a webhook to receive notifications.`}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 flow-root">
      <div className="overflow-x-auto overflow-y-visible">
        <div className="inline-block min-w-full py-2 pb-12 align-middle">
          <div className="relative h-full shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-[700px] divide-y divide-light-600 dark:divide-dark-600">
              <thead className="rounded-t-lg bg-light-300 dark:bg-dark-200">
                <tr>
                  <th
                    scope="col"
                    className="w-[25%] rounded-tl-lg py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light-900 dark:text-dark-900 sm:pl-6"
                  >
                    {t`Name`}
                  </th>
                  <th
                    scope="col"
                    className="w-[30%] px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    {t`URL`}
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    {t`Events`}
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    {t`Status`}
                  </th>
                  <th
                    scope="col"
                    className="w-[10%] px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    {t`Created`}
                  </th>
                  <th
                    scope="col"
                    className="w-[5%] rounded-tr-lg px-3 py-3.5 text-center text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    {/* Actions column */}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-600 bg-light-50 dark:divide-dark-600 dark:bg-dark-100">
                {!isLoading &&
                  webhooks?.map((webhook, index) => (
                    <TableRow
                      key={webhook.publicId}
                      publicId={webhook.publicId}
                      name={webhook.name}
                      url={webhook.url}
                      events={webhook.events}
                      active={webhook.active}
                      createdAt={webhook.createdAt}
                      isLastRow={index === webhooks.length - 1}
                      onEdit={() => {
                        setModalState("EDIT_WEBHOOK", {
                          publicId: webhook.publicId,
                          name: webhook.name,
                          url: webhook.url,
                          events: webhook.events,
                          active: webhook.active,
                        });
                        openModal("EDIT_WEBHOOK", webhook.publicId, webhook.name);
                      }}
                      onTest={() => {
                        testWebhookMutation.mutate({
                          workspacePublicId,
                          webhookPublicId: webhook.publicId,
                        });
                      }}
                      onDelete={() => {
                        openModal("DELETE_WEBHOOK", webhook.publicId, webhook.name);
                      }}
                    />
                  ))}

                {isLoading && (
                  <>
                    <TableRow showSkeleton />
                    <TableRow showSkeleton />
                    <TableRow showSkeleton isLastRow />
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
