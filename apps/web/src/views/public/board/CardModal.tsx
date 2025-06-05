import { authClient } from "@kan/auth/client";
import { useRouter } from "next/router";
import { HiXMark } from "react-icons/hi2";
import Editor from "~/components/Editor";

import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";
import ActivityList from "~/views/card/components/ActivityList";

export function CardModal({
  cardPublicId,
  workspaceSlug,
  boardSlug,
}: {
  cardPublicId: string | null | undefined;
  workspaceSlug: string | null | undefined;
  boardSlug: string | null | undefined;
}) {
  const router = useRouter();
  const { closeModal, isOpen } = useModal();
  const { data: session } = authClient.useSession();

  const { data, isLoading } = api.card.byId.useQuery(
    {
      cardPublicId: cardPublicId ?? "",
    },
    {
      enabled: isOpen && !!cardPublicId,
    },
  );

  const labels = data?.labels ?? [];

  return (
    <div className="flex h-full flex-1 flex-row">
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="h-full max-h-[calc(100vh-4rem)] overflow-y-auto p-8">
          <div className="flex w-full items-center justify-between">
            <button
              className="absolute right-[2rem] top-[2rem] rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
              onClick={async (e) => {
                e.preventDefault();
                closeModal();
                try {
                  await router.replace(
                    `/${workspaceSlug}/${boardSlug}`,
                    undefined,
                    {
                      shallow: true,
                    },
                  );
                } catch (error) {
                  console.error(error);
                }
              }}
            >
              <HiXMark
                size={18}
                className="dark:text-dark-9000 text-light-900"
              />
            </button>
            {isLoading ? (
              <div className="flex space-x-2">
                <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
              </div>
            ) : (
              <>
                <h1 className="font-medium leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                  {data?.title}
                </h1>
              </>
            )}
          </div>
          <div className="mb-6">
            {labels.map((label) => (
              <div
                key={label.publicId}
                className="my-1 mr-1 inline-flex w-fit items-center gap-x-1.5 rounded-full px-2 py-1 text-[12px] font-medium text-light-800 ring-1 ring-inset ring-light-600 dark:text-dark-1000 dark:ring-dark-800"
              >
                <svg
                  fill={label.colourCode ?? "#3730a3"}
                  className="h-2 w-2"
                  viewBox="0 0 6 6"
                  aria-hidden="true"
                >
                  <circle cx={3} cy={3} r={3} />
                </svg>
                <div>{label.name}</div>
              </div>
            ))}
          </div>

          {data?.description && (
            <div className="mb-10 flex w-full max-w-2xl justify-between">
              <div className="mt-2">
                <Editor markdown={data.description} readOnly />
              </div>
            </div>
          )}
          <div className="border-t-[1px] border-light-600 pb-4 pt-12 dark:border-dark-400">
            <h2 className="text-md pb-4 font-medium text-light-900 dark:text-dark-1000">
              Activity
            </h2>
            <div>
              {cardPublicId && (
                <ActivityList
                  cardPublicId={cardPublicId}
                  activities={data?.activities ?? []}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
