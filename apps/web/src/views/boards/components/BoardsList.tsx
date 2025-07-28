import Link from "next/link";
import { t } from "@lingui/core/macro";
import { HiOutlineRectangleStack } from "react-icons/hi2";

import Button from "~/components/Button";
import PatternedBackground from "~/components/PatternedBackground";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export function BoardsList() {
  const { workspace } = useWorkspace();
  const { openModal } = useModal();

  const { data, isLoading } = api.board.all.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: workspace.publicId ? true : false },
  );

  if (isLoading)
    return (
      <div className="grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-7">
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
        <div className="mr-5 flex h-[150px] w-full animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
      </div>
    );

  if (data?.length === 0)
    return (
      <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
        <div className="flex flex-col items-center">
          <HiOutlineRectangleStack className="h-10 w-10 text-light-800 dark:text-dark-800" />
          <p className="mb-2 mt-4 text-[14px] font-bold text-light-1000 dark:text-dark-950">
            {t`No boards`}
          </p>
          <p className="text-[14px] text-light-900 dark:text-dark-900">
            {t`Get started by creating a new board`}
          </p>
        </div>
        <Button onClick={() => openModal("NEW_BOARD")}>
          {t`Create new board`}
        </Button>
      </div>
    );

  return (
    <div className="grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-7">
      {data?.map((board) => (
        <Link key={board.publicId} href={`boards/${board.publicId}`}>
          <div className="align-center relative mr-5 flex h-[150px] w-full items-center justify-center rounded-md border border-dashed border-light-400 bg-light-50 shadow-sm hover:bg-light-200 dark:border-dark-600 dark:bg-dark-50 dark:hover:bg-dark-100">
            <PatternedBackground />
            <p className="px-4 text-[14px] font-bold text-neutral-700 dark:text-dark-1000">
              {board.name}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
