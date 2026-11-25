import Link from "next/link";
import { plural, t } from "@lingui/core/macro";
import { motion } from "framer-motion";
import {
  HiOutlineRectangleStack,
  HiOutlineStar,
  HiStar,
} from "react-icons/hi2";

import { useGetBoards, useUpdateBoard } from "@kan/api-client/hooks";

import Button from "~/components/Button";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { useBoardCache } from "~/utils/boardCache";

export function BoardsList({
  isTemplate,
  archived = false,
}: {
  isTemplate?: boolean;
  archived?: boolean;
}) {
  const { workspace } = useWorkspace();
  const { openModal } = useModal();
  const { canCreateBoard } = usePermissions();

  const boardCache = useBoardCache();
  const updateBoard = useUpdateBoard({
    mutation: {
      onSuccess: () => {
        void boardCache.invalidateLists();
      },
    },
  });

  const { data, isLoading } = useGetBoards(
    workspace.publicId,
    {
      type: isTemplate ? "template" : "regular",
      archived: archived ? "true" : "false",
    },
    { query: { enabled: !!workspace.publicId, select: (res) => res.data } },
  );

  const handleToggleFavorite = (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean | undefined,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    updateBoard.mutate({ boardPublicId, data: { favorite: !currentFavorite } });
  };

  if (isLoading)
    return (
      <div className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-3 2xl:grid-cols-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        <div className="h-[92px] w-full animate-pulse rounded-lg bg-light-200 dark:bg-dark-100" />
        <div className="h-[92px] w-full animate-pulse rounded-lg bg-light-200 dark:bg-dark-100" />
        <div className="h-[92px] w-full animate-pulse rounded-lg bg-light-200 dark:bg-dark-100" />
      </div>
    );

  if (data?.length === 0)
    return (
      <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-5 pb-[150px]">
        <div className="flex flex-col items-center">
          <HiOutlineRectangleStack className="h-7 w-7 text-light-800 dark:text-dark-800" />
          <p className="mt-3 mb-1 text-sm font-medium text-light-1000 dark:text-dark-1000">
            {archived
              ? t`No archived boards`
              : t`No ${isTemplate ? "templates" : "boards"}`}
          </p>
          <p className="text-xs text-light-900 dark:text-dark-900">
            {archived
              ? t`Boards you archive will appear here.`
              : t`Get started by creating a new ${isTemplate ? "template" : "board"}`}
          </p>
        </div>
        <Tooltip
          content={!canCreateBoard ? t`You don't have permission` : undefined}
        >
          <Button
            size="sm"
            onClick={() => {
              if (canCreateBoard) openModal("NEW_BOARD");
            }}
            disabled={!canCreateBoard}
          >
            {t`Create new ${isTemplate ? "template" : "board"}`}
          </Button>
        </Tooltip>
      </div>
    );

  return (
    <motion.div
      className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-3 2xl:grid-cols-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
      layout
    >
      {data?.map((board) => (
        <motion.div
          key={board.publicId}
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            layout: {
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 1,
            },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
          }}
        >
          <Link
            href={`${isTemplate ? "templates" : "boards"}/${board.publicId}`}
            aria-label={board.name}
            className="group relative flex h-[92px] w-full flex-col justify-between rounded-lg p-4 ring-1 ring-light-400 transition-colors ring-inset hover:bg-light-200 dark:ring-dark-300 dark:hover:bg-dark-100"
          >
            <p className="line-clamp-2 pr-7 text-sm font-medium text-neutral-900 dark:text-dark-1000">
              {board.name}
            </p>
            <p className="text-xs text-light-900 dark:text-dark-900">
              {plural(board.lists.length, { one: "# list", other: "# lists" })}
            </p>
            <button
              type="button"
              onClick={(e) =>
                handleToggleFavorite(e, board.publicId, board.favorite)
              }
              className={`absolute top-3 right-3 rounded-md p-1 transition-all hover:bg-light-400 dark:hover:bg-dark-300 ${
                board.favorite
                  ? ""
                  : "md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
              }`}
              aria-label={
                board.favorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              {board.favorite ? (
                <HiStar className="h-4 w-4 text-neutral-700 dark:text-dark-1000" />
              ) : (
                <HiOutlineStar className="h-4 w-4 text-light-900 dark:text-dark-900" />
              )}
            </button>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
