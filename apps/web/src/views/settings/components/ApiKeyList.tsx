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

  const TableRow = ({
    keyId,
    keyName,
    keyStart,
    isLastRow,
    showSkeleton,
  }: {
    keyId?: string;
    keyName?: string | null | undefined;
    keyStart?: string | null | undefined;
    isLastRow?: boolean | undefined;
    showSkeleton?: boolean | undefined;
  }) => {
    return (
      <tr className="rounded-b-lg">
        <td className={twMerge("w-[65%]", isLastRow ? "rounded-bl-lg" : "")}>
          <div className="flex items-center p-4">
            <div className="ml-2 min-w-0 flex-1">
              <div>
                <div className="flex items-center">
                  <p
                    className={twMerge(
                      "mr-2 text-sm font-medium text-neutral-900 dark:text-dark-1000",
                      showSkeleton &&
                        "md mb-2 h-3 w-[125px] animate-pulse rounded-sm bg-light-200 dark:bg-dark-200",
                    )}
                  >
                    {keyName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </td>
        <td
          className={twMerge(
            "w-[35%] min-w-[150px]",
            isLastRow && "rounded-br-lg",
          )}
        >
          <div className="flex w-full items-center justify-between px-3">
            <div>
              <span
                className={twMerge(
                  "inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
                  showSkeleton &&
                    "h-5 w-[50px] animate-pulse bg-light-200 ring-0 dark:bg-dark-200",
                )}
              >
                {keyStart}...
              </span>
            </div>
            <div className={twMerge("relative")}>
              <Dropdown
                items={[
                  {
                    label: "Revoke",
                    action: () =>
                      openModal("REVOKE_API_KEY", keyId, keyName ?? ""),
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
        </td>
      </tr>
    );
  };
  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-visible sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="h-full shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-light-600 dark:divide-dark-600">
              <thead className="rounded-t-lg bg-light-300 dark:bg-dark-200">
                <tr>
                  <th
                    scope="col"
                    className="w-[65%] rounded-tl-lg py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-light-900 dark:text-dark-900 sm:pl-6"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="w-[35%] rounded-tr-lg px-3 py-3.5 text-left text-sm font-semibold text-light-900 dark:text-dark-900"
                  >
                    Key
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-600 bg-light-50 dark:divide-dark-600 dark:bg-dark-100">
                {!isLoading &&
                  data?.data?.map((apiKey, index) => (
                    <TableRow
                      key={apiKey.id}
                      keyId={apiKey.id}
                      keyName={apiKey.name}
                      keyStart={apiKey.start}
                      isLastRow={index === data.data.length - 1}
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
