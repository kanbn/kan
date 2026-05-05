import Link from "next/link";
import { useEffect, useState } from "react";
import { t, Trans } from "@lingui/core/macro";
import { TbLayoutGrid, TbChecklist, TbProgress, TbCircleCheck } from "react-icons/tb";
import { endOfDay, startOfDay, addDays } from "date-fns";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import type { DropResult } from "react-beautiful-dnd";

import { PageHead } from "~/components/PageHead";
import { StrictModeDroppable } from "~/components/StrictModeDroppable";
import { api } from "~/utils/api";
import { useWorkspace } from "~/providers/workspace";

type DueDateFilterKey = "overdue" | "today" | "tomorrow" | "next-week" | "next-month" | "no-due-date";

type FilterOption = {
  label: string;
  filters: DueDateFilterKey[];
};

const FILTER_OPTIONS: FilterOption[] = [
  { label: "Overdue", filters: ["overdue"] },
  { label: "Today", filters: ["today"] },
  { label: "This Week", filters: ["today", "tomorrow", "next-week"] },
  { label: "All", filters: [] },
];

type AggregatedCard = {
  publicId: string;
  title: string;
  dueDate: Date | null;
  boardPublicId: string;
  boardName: string;
  listName: string;
  listPublicId: string;
};

type BoardMeta = {
  firstListPublicId: string;
  lastListPublicId: string;
  middleListPublicId: string | null;
};

type ColumnKey = "todo" | "inProgress" | "done";

type LocalData = {
  todo: AggregatedCard[];
  inProgress: AggregatedCard[];
  done: AggregatedCard[];
};

function DueDateBadge({ dueDate }: { dueDate: Date | null }) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(today);
  const tomorrow = addDays(today, 1);

  const isOverdue = due < today;
  const isToday = due >= today && due <= todayEnd;
  const isTomorrow = due >= tomorrow && due < addDays(tomorrow, 1);

  const formatted = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (isOverdue) {
    return (
      <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
        ⚠ {formatted}
      </span>
    );
  }
  if (isToday) {
    return (
      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
        {formatted}
      </span>
    );
  }
  if (isTomorrow) {
    return (
      <span className="text-[11px] text-light-700 dark:text-dark-700">
        {formatted}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-light-600 dark:text-dark-600">
      {formatted}
    </span>
  );
}

function CardItem({
  card,
  index,
}: {
  card: AggregatedCard;
  index: number;
}) {
  return (
    <Draggable draggableId={card.publicId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Link
            href={`/boards/${card.boardPublicId}`}
            className={`group block rounded-lg border border-light-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-light-300 hover:shadow-md dark:border-dark-300 dark:bg-dark-100 dark:hover:border-dark-400 ${snapshot.isDragging ? "rotate-1 shadow-lg" : ""}`}
          >
            <p className="truncate text-sm font-medium text-light-950 dark:text-dark-950">
              {card.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="truncate rounded bg-light-100 px-1.5 py-0.5 text-[11px] font-medium text-light-700 dark:bg-dark-300 dark:text-dark-700">
                {card.boardName}
              </span>
              <DueDateBadge dueDate={card.dueDate} />
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  );
}

function Column({
  title,
  icon,
  cards,
  isLoading,
  accentClass,
  droppableId,
}: {
  title: React.ReactNode;
  icon: React.ReactNode;
  cards: AggregatedCard[];
  isLoading: boolean;
  accentClass: string;
  droppableId: ColumnKey;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-light-200 bg-light-50 dark:border-dark-300 dark:bg-dark-200/50">
      <div className="flex items-center gap-2 border-b border-light-200 px-4 py-3 dark:border-dark-300">
        <span className={accentClass}>{icon}</span>
        <h2 className="text-sm font-semibold text-light-900 dark:text-dark-900">
          {title}
        </h2>
        {!isLoading && (
          <span className="ml-auto rounded-full bg-light-200 px-2 py-0.5 text-xs font-medium text-light-800 dark:bg-dark-400 dark:text-dark-800">
            {cards.length}
          </span>
        )}
      </div>
      <StrictModeDroppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 overflow-y-auto p-3 transition-colors ${snapshot.isDraggingOver ? "bg-light-100 dark:bg-dark-300/30" : ""}`}
          >
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg bg-light-200 dark:bg-dark-300"
                />
              ))
            ) : cards.length === 0 && !snapshot.isDraggingOver ? (
              <p className="py-6 text-center text-sm text-light-600 dark:text-dark-600">
                <Trans>No cards</Trans>
              </p>
            ) : (
              cards.map((card, i) => (
                <CardItem key={card.publicId} card={card} index={i} />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </StrictModeDroppable>
    </div>
  );
}

export default function AllBoardsView() {
  const { workspace } = useWorkspace();
  const [activeFilter, setActiveFilter] = useState<FilterOption>(FILTER_OPTIONS[0]!);
  const [localData, setLocalData] = useState<LocalData>({ todo: [], inProgress: [], done: [] });
  const [boardMeta, setBoardMeta] = useState<Record<string, BoardMeta>>({});
  const utils = api.useUtils();

  const { data, isLoading } = api.board.allCardsAggregated.useQuery(
    {
      workspacePublicId: workspace.publicId,
      dueDateFilters: activeFilter.filters.length ? activeFilter.filters : undefined,
    },
    { enabled: !!workspace.publicId },
  );

  useEffect(() => {
    if (data) {
      setLocalData({ todo: data.todo, inProgress: data.inProgress, done: data.done });
      setBoardMeta(data.boardMeta);
    }
  }, [data]);

  const updateCard = api.card.update.useMutation({
    onError: () => {
      void utils.board.allCardsAggregated.invalidate();
    },
  });

  const onDragEnd = ({ source, destination, draggableId }: DropResult) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const srcCol = source.droppableId as ColumnKey;
    const dstCol = destination.droppableId as ColumnKey;

    const card = localData[srcCol][source.index];
    if (!card) return;

    const meta = boardMeta[card.boardPublicId];
    if (!meta) return;

    let targetListPublicId: string | null = null;
    if (dstCol === "todo") targetListPublicId = meta.firstListPublicId;
    else if (dstCol === "done") targetListPublicId = meta.lastListPublicId;
    else if (dstCol === "inProgress") targetListPublicId = meta.middleListPublicId;

    if (!targetListPublicId) return;

    // Optimistic update
    setLocalData((prev) => {
      const srcCards = [...prev[srcCol]];
      const [moved] = srcCards.splice(source.index, 1);
      if (!moved) return prev;

      const updatedCard = { ...moved, listPublicId: targetListPublicId! };

      if (srcCol === dstCol) {
        srcCards.splice(destination.index, 0, updatedCard);
        return { ...prev, [srcCol]: srcCards };
      }

      const dstCards = [...prev[dstCol]];
      dstCards.splice(destination.index, 0, updatedCard);
      return { ...prev, [srcCol]: srcCards, [dstCol]: dstCards };
    });

    updateCard.mutate({
      cardPublicId: draggableId,
      listPublicId: targetListPublicId,
      index: destination.index,
    });
  };

  return (
    <>
      <PageHead title={t`All Boards | kan.bn`} />
      <div className="flex h-full flex-col overflow-hidden p-4 sm:p-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-3xl">
              <TbLayoutGrid className="text-primary-600 dark:text-primary-400" />
              <Trans>All Boards</Trans>
            </h1>
            <p className="mt-0.5 text-sm text-light-800 dark:text-dark-800">
              <Trans>Cards across all your boards in one view</Trans>
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center rounded-lg border border-light-200 bg-light-100 p-0.5 dark:border-dark-300 dark:bg-dark-200">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.label}
                onClick={() => setActiveFilter(option)}
                className={
                  activeFilter.label === option.label
                    ? "rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-light-1000 shadow-sm dark:bg-dark-100 dark:text-dark-1000"
                    : "px-3 py-1.5 text-xs font-medium text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-900"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban columns */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
            <Column
              title={<Trans>To Do</Trans>}
              icon={<TbChecklist size={16} />}
              cards={localData.todo}
              isLoading={isLoading}
              accentClass="text-amber-500 dark:text-amber-400"
              droppableId="todo"
            />
            <Column
              title={<Trans>In Progress</Trans>}
              icon={<TbProgress size={16} />}
              cards={localData.inProgress}
              isLoading={isLoading}
              accentClass="text-blue-500 dark:text-blue-400"
              droppableId="inProgress"
            />
            <Column
              title={<Trans>Done</Trans>}
              icon={<TbCircleCheck size={16} />}
              cards={localData.done}
              isLoading={isLoading}
              accentClass="text-green-500 dark:text-green-400"
              droppableId="done"
            />
          </div>
        </DragDropContext>
      </div>
    </>
  );
}
