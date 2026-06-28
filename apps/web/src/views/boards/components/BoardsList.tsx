import type { DragEndEvent } from "@dnd-kit/core";
import { useRouter } from "next/router";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { t } from "@lingui/core/macro";
import { useRef } from "react";
import { HiOutlineRectangleStack } from "react-icons/hi2";

import Button from "~/components/Button";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { SortableBoardCard } from "./SortableBoardCard";

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
  const router = useRouter();

  const utils = api.useUtils();

  const queryInput = {
    workspacePublicId: workspace.publicId,
    type: isTemplate ? ("template" as const) : ("regular" as const),
    archived,
  };

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      void utils.board.all.invalidate();
    },
  });

  const reorderBoard = api.board.reorder.useMutation({
    onMutate: ({ boardPublicId, newPosition }) => {
      const previousData = utils.board.all.getData(queryInput);

      // Apply the optimistic reorder synchronously (before any await) so it
      // batches into the same render as dnd-kit clearing the drag transform.
      // Otherwise the card snaps back to its original slot for one frame before
      // jumping to the new slot.
      utils.board.all.setData(queryInput, (old) => {
        if (!old) return old;

        const moved = old.find((b) => b.publicId === boardPublicId);
        if (!moved) return old;

        // newPosition is the index within the board's favourite group; map it
        // back to an absolute index in the full (favourites-first) list.
        const group = old.filter((b) => b.favorite === moved.favorite);
        const target = group[newPosition];
        if (!target) return old;

        const oldIndex = old.findIndex((b) => b.publicId === boardPublicId);
        const newIndex = old.findIndex((b) => b.publicId === target.publicId);
        if (oldIndex === -1 || newIndex === -1) return old;

        return arrayMove(old, oldIndex, newIndex);
      });

      // Cancel in-flight refetches so they can't clobber the optimistic order.
      void utils.board.all.cancel(queryInput);

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        utils.board.all.setData(queryInput, context.previousData);
      }
    },
    onSuccess: () => {
      // The optimistic order already matches what the server computes, so mark
      // the query stale WITHOUT refetching now. Refetching immediately replaces
      // the array mid-animation, which makes dnd-kit re-measure from stale
      // positions and the cards fly in from a default spot. It refreshes on the
      // next natural trigger (focus/remount).
      void utils.board.all.invalidate(queryInput, { refetchType: "none" });
    },
  });

  const { data, isLoading } = api.board.all.useQuery(queryInput, {
    enabled: workspace.publicId ? true : false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require an 8px drag before activating so plain clicks still navigate.
      activationConstraint: { distance: 8 },
    }),
  );

  // Whether the current pointer interaction became a drag. The browser fires a
  // `click` on pointer-release after a drag; `handleOpenBoard` reads this to skip
  // navigation for that click. Reset on pointer-down, set in `onDragStart` (which
  // only fires once the 8px threshold is passed).
  const didDragRef = useRef(false);

  const handleToggleFavorite = (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean | undefined,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    updateBoard.mutate({
      boardPublicId,
      favorite: !currentFavorite,
    });
  };

  const handlePointerDownCapture = () => {
    didDragRef.current = false;
  };

  const handleDragStart = () => {
    didDragRef.current = true;
  };

  const handleOpenBoard = (
    e: React.MouseEvent | React.KeyboardEvent,
    boardPublicId: string,
  ) => {
    // Skip the click the browser fires right after a drag.
    if (didDragRef.current) return;

    const path = `/${isTemplate ? "templates" : "boards"}/${boardPublicId}`;

    if (e.metaKey || e.ctrlKey) {
      window.open(path, "_blank");
      return;
    }

    void router.push(path);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !data) return;

    const activeBoard = data.find((b) => b.publicId === active.id);
    const overBoard = data.find((b) => b.publicId === over.id);
    if (!activeBoard || !overBoard) return;

    // Reordering only happens within the same favourite group; cross-group
    // moves are handled via the favourite toggle.
    if (activeBoard.favorite !== overBoard.favorite) return;

    const group = data.filter((b) => b.favorite === activeBoard.favorite);
    const newPosition = group.findIndex((b) => b.publicId === over.id);
    if (newPosition === -1) return;

    reorderBoard.mutate({
      boardPublicId: active.id as string,
      newPosition,
    });
  };

  if (isLoading)
    return (
      <div className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
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
            {archived
              ? t`No archived boards`
              : t`No ${isTemplate ? "templates" : "boards"}`}
          </p>
          <p className="text-[14px] text-light-900 dark:text-dark-900">
            {archived
              ? t`Boards you archive will appear here.`
              : t`Get started by creating a new ${isTemplate ? "template" : "board"}`}
          </p>
        </div>
        <Tooltip
          content={!canCreateBoard ? t`You don't have permission` : undefined}
        >
          <Button
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={(data ?? []).map((b) => b.publicId)}
        strategy={rectSortingStrategy}
      >
        <div
          onPointerDownCapture={handlePointerDownCapture}
          className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
        >
          {data?.map((board) => (
            <SortableBoardCard
              key={board.publicId}
              board={board}
              onOpen={handleOpenBoard}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
