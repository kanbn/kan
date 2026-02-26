import type { DragEndEvent } from "@dnd-kit/core";
import type { AnimateLayoutChanges } from "@dnd-kit/sortable";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import { useRef } from "react";
import {
  HiOutlineRectangleStack,
  HiOutlineStar,
  HiStar,
} from "react-icons/hi2";

import Button from "~/components/Button";
import PatternedBackground from "~/components/PatternedBackground";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface SortableBoardCardProps {
  board: {
    publicId: string;
    name: string;
    favorite: boolean;
  };
  canDrag: boolean;
  wasDragging: React.RefObject<boolean>;
  onToggleFavorite: (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean,
  ) => void;
  onNavigate: (boardPublicId: string) => void;
}

const animateLayoutChanges: AnimateLayoutChanges = () => false;

function SortableBoardCard({
  board,
  canDrag,
  wasDragging,
  onToggleFavorite,
  onNavigate,
}: SortableBoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: board.publicId,
    disabled: !canDrag,
    animateLayoutChanges,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!wasDragging.current) {
          onNavigate(board.publicId);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="group relative mr-5 flex h-[150px] w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-light-400 bg-light-50 shadow-sm hover:bg-light-200 dark:border-dark-600 dark:bg-dark-50 dark:hover:bg-dark-100">
        <PatternedBackground />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e, board.publicId, board.favorite);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute right-3 top-3 z-10 rounded p-1 transition-all hover:bg-light-300 dark:hover:bg-dark-200 ${
            board.favorite ? "" : "md:opacity-0 md:group-hover:opacity-100"
          }`}
          aria-label={
            board.favorite ? "Remove from favorites" : "Add to favorites"
          }
        >
          {board.favorite ? (
            <HiStar className="h-5 w-5 text-neutral-700 dark:text-dark-1000" />
          ) : (
            <HiOutlineStar className="h-5 w-5 text-neutral-700 dark:text-dark-800" />
          )}
        </button>
        <p className="px-4 text-[14px] font-bold text-neutral-700 dark:text-dark-1000">
          {board.name}
        </p>
      </div>
    </div>
  );
}

export function BoardsList({ isTemplate }: { isTemplate?: boolean }) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const { canCreateBoard, canEditBoard } = usePermissions();

  const wasDragging = useRef(false);
  const utils = api.useUtils();

  const queryParams = {
    workspacePublicId: workspace.publicId,
    type: isTemplate ? ("template" as const) : ("regular" as const),
  };

  const updateBoard = api.board.update.useMutation({
    onSuccess: () => {
      void utils.board.all.invalidate();
    },
  });

  const previousDataRef = useRef<
    ReturnType<typeof utils.board.all.getData> | undefined
  >(undefined);

  const reorderBoard = api.board.update.useMutation({
    onMutate: async () => {
      await utils.board.all.cancel();
      // Snapshot is already saved in previousDataRef before mutation is called
    },
    onError: () => {
      if (previousDataRef.current) {
        utils.board.all.setData(queryParams, previousDataRef.current);
      }
      showPopup({
        header: t`Unable to reorder board`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.all.invalidate();
    },
  });

  const { data, isLoading } = api.board.all.useQuery(queryParams, {
    enabled: !!workspace.publicId,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleToggleFavorite = (
    e: React.MouseEvent,
    boardPublicId: string,
    currentFavorite: boolean,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    updateBoard.mutate({
      boardPublicId,
      favorite: !currentFavorite,
    });
  };

  const handleNavigate = (boardPublicId: string) => {
    const path = isTemplate
      ? `templates/${boardPublicId}`
      : `boards/${boardPublicId}`;
    void router.push(path);
  };

  const handleDragStart = () => {
    wasDragging.current = true;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Reset after dnd-kit's 50ms document listener cleanup + buffer
    setTimeout(() => {
      wasDragging.current = false;
    }, 100);

    const { active, over } = event;
    if (!over || !data || active.id === over.id) return;

    const oldIndex = data.findIndex((b) => b.publicId === active.id);
    const newIndex = data.findIndex((b) => b.publicId === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Save snapshot for rollback, then immediately reorder so items don't snap back
    previousDataRef.current = utils.board.all.getData(queryParams);
    utils.board.all.setData(queryParams, (oldData) => {
      if (!oldData) return oldData;
      return arrayMove(oldData, oldIndex, newIndex);
    });

    reorderBoard.mutate({
      boardPublicId: active.id as string,
      position: newIndex,
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
            {t`No ${isTemplate ? "templates" : "boards"}`}
          </p>
          <p className="text-[14px] text-light-900 dark:text-dark-900">
            {t`Get started by creating a new ${isTemplate ? "template" : "board"}`}
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

  const boardIds = data?.map((b) => b.publicId) ?? [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={boardIds} strategy={rectSortingStrategy}>
        <div className="3xl:grid-cols-4 grid h-fit w-full grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
          {data?.map((board) => (
            <SortableBoardCard
              key={board.publicId}
              board={board}
              canDrag={canEditBoard}
              wasDragging={wasDragging}
              onToggleFavorite={handleToggleFavorite}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
