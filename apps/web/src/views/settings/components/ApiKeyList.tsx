import { useQuery } from "@tanstack/react-query";
import { HiEllipsisHorizontal } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { authClient } from "@kan/auth/client";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";

export default function ApiKeyList() {
  const { openModal } = useModal();

  const { data, isLoading } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => authClient.apiKey.list(),
  });
  const apiKeys = data?.data?.apiKeys ?? [];

  const renderTableRow = ({
    key,
    keyId,
    keyName,
    keyStart,
    createdAt,
    lastRequest,
    showSkeleton,
  }: {
    key?: string;
    keyId?: string;
    keyName?: string | null | undefined;
    keyStart?: string | null | undefined;
    createdAt?: Date | null;
    lastRequest?: Date | null;
    showSkeleton?: boolean | undefined;
  }) => {
    const formatDate = (date?: Date | string | null) => {
      if (!date) return "Never";
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    return (
      <tr
        key={key}
        className="group/row h-12 transition-colors hover:bg-light-200 dark:hover:bg-dark-100"
      >
        <td className="w-[30%]">
          <div className="flex items-center px-2">
            <div className="min-w-0 flex-1">
              <div>
                <div className="flex items-center">
                  <p
                    className={twMerge(
                      "mr-2 text-sm font-medium text-neutral-900 dark:text-dark-1000",
                      showSkeleton &&
                        "md mb-2 h-3 w-[125px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
                    )}
                  >
                    {keyName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </td>
        <td className="w-[20%] px-2">
          <p
            className={twMerge(
              "text-xs text-light-900 dark:text-dark-900",
              showSkeleton &&
                "h-3 w-[80px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
            )}
          >
            {formatDate(createdAt)}
          </p>
        </td>
        <td className="w-[20%] px-2">
          <p
            className={twMerge(
              "text-xs text-light-900 dark:text-dark-900",
              showSkeleton &&
                "h-3 w-[80px] animate-pulse rounded-xs bg-light-200 dark:bg-dark-200",
            )}
          >
            {formatDate(lastRequest)}
          </p>
        </td>
        <td className="w-[25%] px-2">
          <div>
            <span
              className={twMerge(
                "inline-flex items-center font-mono text-xs text-light-900 dark:text-dark-900",
                showSkeleton &&
                  "h-5 w-[50px] animate-pulse bg-light-200 dark:bg-dark-200",
              )}
            >
              {keyStart}...
            </span>
          </div>
        </td>
        <td className="w-[5%] min-w-[40px]">
          <div className="flex w-full items-center justify-end px-2">
            <div className="relative transition-opacity md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100">
              <Dropdown
                items={[
                  {
                    label: "Revoke",
                    action: () =>
                      openModal("REVOKE_API_KEY", keyId, keyName ?? ""),
                  },
                ]}
                ariaLabel="API key options"
                buttonClassName="h-6 w-6 hover:bg-light-400 dark:hover:bg-dark-300"
              >
                <HiEllipsisHorizontal
                  size={16}
                  className="text-light-900 dark:text-dark-900"
                />
              </Dropdown>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  if (!isLoading && apiKeys.length === 0) {
    return null;
  }

  return (
    <div className="-mx-2 mt-4 flow-root">
      <div className="overflow-x-auto overflow-y-visible">
        <div className="inline-block min-w-full py-2 pb-16 align-middle">
          <div className="relative h-full">
            <table className="w-full min-w-[600px]">
              <thead className="border-b border-light-400 dark:border-dark-300">
                <tr>
                  <th
                    scope="col"
                    className="w-[30%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="w-[20%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    Last Used
                  </th>
                  <th
                    scope="col"
                    className="w-[25%] px-2 pb-2 text-left text-xs font-medium text-light-900 dark:text-dark-900"
                  >
                    Key
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
                  apiKeys.map((apiKey) =>
                    renderTableRow({
                      key: apiKey.id,
                      keyId: apiKey.id,
                      keyName: apiKey.name,
                      keyStart: apiKey.start,
                      createdAt: apiKey.createdAt,
                      lastRequest: apiKey.lastRequest,
                    }),
                  )}

                {isLoading && (
                  <>
                    {renderTableRow({ showSkeleton: true })}
                    {renderTableRow({ showSkeleton: true })}
                    {renderTableRow({ showSkeleton: true })}
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
