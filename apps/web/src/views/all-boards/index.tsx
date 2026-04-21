import Link from "next/link";
import { useState } from "react";
import { t, Trans } from "@lingui/core/macro";
import { TbLayoutGrid, TbChecklist, TbProgress, TbCircleCheck } from "react-icons/tb";
import { endOfDay, startOfDay, addDays } from "date-fns";

import { PageHead } from "~/components/PageHead";
import { api } from "~/utils/api";
import { useWorkspace } from "~/providers/workspace";

type DueDateFilterKey = "overdue" | "today" | "tomorrow" | "next-week" | "next-month" | "no-due-date";

type FilterOption = {
  label: string;
  filters: DueDateFilterKey[];
};

const FILTER_OPTIONS: FilterOption[] = [
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

function CardItem({ card }: { card: AggregatedCard }) {
  return (
    <Link
      href={`/boards/${card.boardPublicId}`}
      className="group block rounded-lg border border-light-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-light-300 hover:shadow-md dark:border-dark-300 dark:bg-dark-100 dark:hover:border-dark-400"
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
  );
}

function Column({
  title,
  icon,
  cards,
  isLoading,
  accentClass,
}: {
  title: React.ReactNode;
  icon: React.ReactNode;
  cards: AggregatedCard[];
  isLoading: boolean;
  accentClass: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-light-200 bg-light-50 dark:border-dark-300 dark:bg-dark-200/50">
      <div className={`flex items-center gap-2 border-b border-light-200 px-4 py-3 dark:border-dark-300`}>
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
      <div className="flex flex-col gap-2 overflow-y-auto p-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-light-200 dark:bg-dark-300"
            />
          ))
        ) : cards.length === 0 ? (
          <p className="py-6 text-center text-sm text-light-600 dark:text-dark-600">
            <Trans>No cards</Trans>
          </p>
        ) : (
          cards.map((card) => <CardItem key={card.publicId} card={card} />)
        )}
      </div>
    </div>
  );
}

export default function AllBoardsView() {
  const { workspace } = useWorkspace();
  const [activeFilter, setActiveFilter] = useState<FilterOption>(FILTER_OPTIONS[0]!);

  const { data, isLoading } = api.board.allCardsAggregated.useQuery(
    {
      workspacePublicId: workspace.publicId,
      dueDateFilters: activeFilter.filters.length ? activeFilter.filters : undefined,
    },
    { enabled: !!workspace.publicId },
  );

  const todo = data?.todo ?? [];
  const inProgress = data?.inProgress ?? [];
  const done = data?.done ?? [];

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
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
          <Column
            title={<Trans>To Do</Trans>}
            icon={<TbChecklist size={16} />}
            cards={todo}
            isLoading={isLoading}
            accentClass="text-amber-500 dark:text-amber-400"
          />
          <Column
            title={<Trans>In Progress</Trans>}
            icon={<TbProgress size={16} />}
            cards={inProgress}
            isLoading={isLoading}
            accentClass="text-blue-500 dark:text-blue-400"
          />
          <Column
            title={<Trans>Done</Trans>}
            icon={<TbCircleCheck size={16} />}
            cards={done}
            isLoading={isLoading}
            accentClass="text-green-500 dark:text-green-400"
          />
        </div>
      </div>
    </>
  );
}
