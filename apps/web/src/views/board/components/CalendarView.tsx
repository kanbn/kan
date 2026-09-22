import type { DragEndEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@lingui/core/macro";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  HiCalendarDays,
  HiChevronLeft,
  HiChevronRight,
  HiOutlinePlusSmall,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { isPlaceholderPublicId } from "~/utils/helpers";

const MAX_CARDS_PER_DAY = 3;

interface CalendarCard {
  publicId: string;
  title: string;
  cardNumber: number | null;
  dueDate: Date | null;
  labels: { name: string; colourCode: string | null }[];
}

interface DraggableCalendarCardProps {
  card: CalendarCard;
  href: string;
  ticketNumber: string | null;
  disabled: boolean;
}

function DraggableCalendarCard({
  card,
  href,
  ticketNumber,
  disabled,
}: DraggableCalendarCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.publicId,
      disabled,
    });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <Link
        href={href}
        onClick={(e) => {
          e.stopPropagation();
          if (isPlaceholderPublicId(card.publicId)) {
            e.preventDefault();
          }
        }}
        className={twMerge(
          "group flex items-center gap-1.5 rounded-[4px] px-1 py-0.5 text-xs hover:bg-light-200 dark:hover:bg-dark-200",
          !disabled && isDragging ? "cursor-grabbing" : "cursor-pointer",
        )}
      >
        <span className="flex size-2 flex-none items-center">
          {card.labels[0] && (
            <LabelIcon colourCode={card.labels[0].colourCode} />
          )}
        </span>
        <span className="flex-auto truncate text-light-1000 dark:text-dark-1000">
          {card.title}
        </span>
        {ticketNumber && (
          <span className="hidden flex-none text-light-800 dark:text-dark-800 xl:block">
            {ticketNumber}
          </span>
        )}
      </Link>
    </li>
  );
}

interface DroppableDayCellProps {
  dayKey: string;
  children: ReactNode;
}

function DroppableDayCell({ dayKey, children }: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });

  return (
    <ol
      ref={setNodeRef}
      className={twMerge(
        "mt-1 min-h-0 flex-1 space-y-px rounded-[4px]",
        isOver && "bg-light-200 dark:bg-dark-200",
      )}
    >
      {children}
    </ol>
  );
}

interface CalendarViewProps {
  lists: { cards: CalendarCard[] }[];
  cardPrefix: string;
  weekStartsOn: 0 | 1 | 6;
  isTemplate: boolean;
  boardId: string;
  canEditCard: boolean;
  canCreateCard: boolean;
  cardReturnQuery: string;
  isLocked: boolean;
  upgradeUrl: string;
  onDateClick: (date: Date) => void;
  onCardDrop: (
    cardPublicId: string,
    dueDate: Date,
    onSettled: () => void,
  ) => void;
}

const CalendarView = ({
  lists,
  cardPrefix,
  weekStartsOn,
  isTemplate,
  boardId,
  canEditCard,
  canCreateCard,
  cardReturnQuery,
  isLocked,
  upgradeUrl,
  onDateClick,
  onCardDrop,
}: CalendarViewProps) => {
  const { dateLocale } = useLocalisation();
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const cardHref = (cardPublicId: string) =>
    isTemplate
      ? `/templates/${boardId}/cards/${cardPublicId}${cardReturnQuery}`
      : `/cards/${cardPublicId}${cardReturnQuery}`;

  const ticketNumber = (card: CalendarCard) =>
    card.cardNumber != null ? `${cardPrefix}-${card.cardNumber}` : null;

  const [pendingMove, setPendingMove] = useState<{
    cardPublicId: string;
    dueDate: Date;
  } | null>(null);

  const cardsByDay = useMemo(() => {
    const map = new Map<string, CalendarCard[]>();

    for (const list of lists) {
      for (const card of list.cards) {
        const dueDate =
          pendingMove?.cardPublicId === card.publicId
            ? pendingMove.dueDate
            : card.dueDate;
        if (!dueDate) continue;
        const key = format(dueDate, "yyyy-MM-dd");
        const existing = map.get(key) ?? [];
        existing.push(card);
        map.set(key, existing);
      }
    }

    return map;
  }, [lists, pendingMove]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(
      (date) => {
        const key = format(date, "yyyy-MM-dd");
        return {
          date,
          key,
          isCurrentMonth: isSameMonth(date, currentMonth),
          isToday: isToday(date),
          cards: cardsByDay.get(key) ?? [],
        };
      },
    );
  }, [currentMonth, cardsByDay, weekStartsOn]);

  const dayHeaders = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn });
    return eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    }).map((date) => ({
      narrow: format(date, "EEEEE", { locale: dateLocale }),
      short: format(date, "EEE", { locale: dateLocale }),
    }));
  }, [weekStartsOn, dateLocale]);

  const selectedCards = useMemo(
    () => cardsByDay.get(format(selectedDate, "yyyy-MM-dd")) ?? [],
    [cardsByDay, selectedDate],
  );

  const goToMonth = (month: Date) => {
    setCurrentMonth(month);
    const today = new Date();
    setSelectedDate(isSameMonth(month, today) ? today : startOfMonth(month));
  };

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (activeId == null) return;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = "";
    };
  }, [activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const activeCard = useMemo(
    () =>
      activeId == null
        ? null
        : (days
            .flatMap((day) => day.cards)
            .find((card) => card.publicId === activeId) ?? null),
    [activeId, days],
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const sourceDay = days.find((day) =>
      day.cards.some((card) => card.publicId === active.id),
    );
    if (!sourceDay || sourceDay.key === over.id) return;

    const targetDay = days.find((day) => day.key === over.id);
    if (!targetDay) return;

    const cardPublicId = String(active.id);
    setPendingMove({ cardPublicId, dueDate: targetDay.date });
    onCardDrop(cardPublicId, targetDay.date, () => setPendingMove(null));
  };

  const navButtonClasses =
    "flex h-8 w-9 items-center justify-center text-light-900 hover:bg-light-200 hover:text-light-1000 dark:text-dark-900 dark:hover:bg-dark-200 dark:hover:text-dark-1000";
  const dividerClasses = "h-5 w-px bg-light-300 dark:bg-dark-300";

  return (
    <div className="z-0 flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-light-300 px-6 pb-4 dark:border-dark-300 md:px-8">
        <h2 className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
          <time dateTime={format(currentMonth, "yyyy-MM")}>
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </time>
        </h2>
        <div className="flex items-center rounded-md border-[1px] border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-50">
          <button
            type="button"
            aria-label={t`Previous month`}
            onClick={() => goToMonth(subMonths(currentMonth, 1))}
            className={twMerge(navButtonClasses, "rounded-l-md")}
          >
            <HiChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className={dividerClasses} />
          <button
            type="button"
            onClick={() => goToMonth(startOfMonth(new Date()))}
            className="px-3 py-1.5 text-xs font-semibold text-light-1000 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-200"
          >
            {t`Today`}
          </button>
          <span className={dividerClasses} />
          <button
            type="button"
            aria-label={t`Next month`}
            onClick={() => goToMonth(addMonths(currentMonth, 1))}
            className={twMerge(navButtonClasses, "rounded-r-md")}
          >
            <HiChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          aria-hidden={isLocked}
          className={twMerge(
            "flex min-h-0 flex-1 flex-col",
            isLocked && "pointer-events-none select-none blur-[6px]",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-7 gap-px border-b border-light-300 bg-light-300 text-center text-xs font-semibold text-light-900 dark:border-dark-300 dark:bg-dark-300 dark:text-dark-900">
              {dayHeaders.map((day) => (
                <div
                  key={day.short}
                  className="bg-light-100 py-2 dark:bg-dark-100"
                >
                  <span className="sm:hidden">{day.narrow}</span>
                  <span className="hidden sm:inline">{day.short}</span>
                </div>
              ))}
            </div>

            <DndContext
              sensors={sensors}
              onDragStart={({ active }) => setActiveId(String(active.id))}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <div className="hidden min-h-0 flex-1 overflow-y-auto bg-light-300 dark:bg-dark-300 lg:block">
                <div className="grid min-h-full auto-rows-[minmax(7.5rem,1fr)] grid-cols-7 gap-px">
                  {days.map((day) => {
                    const overflowCount = day.cards.length - MAX_CARDS_PER_DAY;

                    return (
                      <div
                        key={day.key}
                        onClick={() => canCreateCard && onDateClick(day.date)}
                        className={twMerge(
                          "flex min-h-0 flex-col overflow-hidden px-2 py-1.5",
                          day.isCurrentMonth
                            ? "bg-light-50 dark:bg-dark-50"
                            : "bg-light-100 dark:bg-dark-100",
                          canCreateCard && "cursor-pointer",
                        )}
                      >
                        <time
                          dateTime={day.key}
                          className={twMerge(
                            "flex size-6 flex-none items-center justify-center rounded-full text-xs",
                            day.isCurrentMonth
                              ? "text-light-950 dark:text-dark-950"
                              : "text-light-800 dark:text-dark-700",
                            day.isToday &&
                              "bg-light-1000 font-semibold text-light-50 dark:bg-dark-1000 dark:text-dark-50",
                          )}
                        >
                          {format(day.date, "d")}
                        </time>
                        <DroppableDayCell dayKey={day.key}>
                          {day.cards.slice(0, MAX_CARDS_PER_DAY).map((card) => (
                            <DraggableCalendarCard
                              key={card.publicId}
                              card={card}
                              href={cardHref(card.publicId)}
                              ticketNumber={ticketNumber(card)}
                              disabled={
                                !canEditCard ||
                                isPlaceholderPublicId(card.publicId)
                              }
                            />
                          ))}
                          {overflowCount > 0 && (
                            <li
                              onClick={(e) => e.stopPropagation()}
                              className="px-1 text-xs text-light-800 dark:text-dark-800"
                            >
                              {t`+ ${overflowCount} more`}
                            </li>
                          )}
                        </DroppableDayCell>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DragOverlay>
                {activeCard ? (
                  <div className="flex items-center gap-1.5 rounded-[4px] bg-light-50 px-1 py-0.5 text-xs shadow-md dark:bg-dark-50">
                    <span className="flex size-2 flex-none items-center">
                      {activeCard.labels[0] && (
                        <LabelIcon
                          colourCode={activeCard.labels[0].colourCode}
                        />
                      )}
                    </span>
                    <span className="flex-auto truncate text-light-1000 dark:text-dark-1000">
                      {activeCard.title}
                    </span>
                    {ticketNumber(activeCard) && (
                      <span className="flex-none text-light-800 dark:text-dark-800">
                        {ticketNumber(activeCard)}
                      </span>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            <div className="min-h-0 flex-1 overflow-y-auto bg-light-300 dark:bg-dark-300 lg:hidden">
              <div className="isolate grid min-h-full auto-rows-[minmax(3.5rem,1fr)] grid-cols-7 gap-px">
                {days.map((day) => {
                  const isSelected = isSameDay(day.date, selectedDate);

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={twMerge(
                        "flex min-h-14 flex-col items-center justify-start gap-1 px-1 py-1.5 focus:z-10",
                        day.isCurrentMonth
                          ? "bg-light-50 dark:bg-dark-50"
                          : "bg-light-100 dark:bg-dark-100",
                      )}
                    >
                      <time
                        dateTime={day.key}
                        className={twMerge(
                          "flex size-6 flex-none items-center justify-center rounded-full text-xs",
                          day.isCurrentMonth
                            ? "text-light-950 dark:text-dark-950"
                            : "text-light-800 dark:text-dark-700",
                          day.isToday &&
                            "font-semibold text-light-1000 dark:text-dark-1000",
                          isSelected &&
                            "bg-light-1000 font-semibold text-light-50 dark:bg-dark-1000 dark:text-dark-50",
                        )}
                      >
                        {format(day.date, "d")}
                      </time>
                      <span className="sr-only">
                        {t`${day.cards.length} cards due`}
                      </span>
                      <span className="flex flex-wrap justify-center gap-0.5">
                        {day.cards.map((card) => (
                          <span
                            key={card.publicId}
                            className="size-1.5 rounded-full bg-light-800 dark:bg-dark-700"
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-light-300 px-6 py-4 dark:border-dark-300 lg:hidden">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-light-900 dark:text-dark-900">
                  {format(selectedDate, "EEEE d MMMM", { locale: dateLocale })}
                </h3>
                {canCreateCard && (
                  <button
                    type="button"
                    onClick={() => onDateClick(selectedDate)}
                    className="flex items-center gap-1 rounded-[5px] px-2 py-1 text-xs font-semibold text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                  >
                    <HiOutlinePlusSmall
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {t`Add card`}
                  </button>
                )}
              </div>
              {selectedCards.length === 0 ? (
                <p className="text-sm text-light-900 dark:text-dark-900">
                  {t`No cards due`}
                </p>
              ) : (
                <ol className="divide-y divide-light-200 overflow-hidden rounded-md border-[1px] border-light-200 bg-light-50 dark:divide-dark-200 dark:border-dark-200 dark:bg-dark-50">
                  {selectedCards.map((card) => (
                    <li key={card.publicId}>
                      <Link
                        href={cardHref(card.publicId)}
                        onClick={(e) => {
                          if (isPlaceholderPublicId(card.publicId)) {
                            e.preventDefault();
                          }
                        }}
                        className="flex items-center gap-2 p-3 hover:bg-light-100 dark:hover:bg-dark-100"
                      >
                        <span className="flex size-2 flex-none items-center">
                          {card.labels[0] && (
                            <LabelIcon colourCode={card.labels[0].colourCode} />
                          )}
                        </span>
                        <span className="flex-auto truncate text-sm text-light-1000 dark:text-dark-1000">
                          {card.title}
                        </span>
                        {ticketNumber(card) && (
                          <span className="flex-none text-xs text-light-800 dark:text-dark-800">
                            {ticketNumber(card)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-light-50/25 p-6 dark:bg-dark-50/25">
            <div className="w-full max-w-[22rem] rounded-xl border-[1px] border-light-600 bg-light-50 p-7 text-center shadow-lg dark:border-dark-600 dark:bg-dark-50">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-light-300 bg-light-200 text-light-1000 dark:border-dark-600 dark:bg-dark-200 dark:text-dark-1000">
                <HiCalendarDays className="h-4 w-4" />
              </div>
              <h3 className="mb-2 text-base font-bold text-light-1000 dark:text-dark-1000">
                {t`Never lose track of what's due`}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-light-900 dark:text-dark-900">
                {t`See all your cards across the month, then drag and drop to reschedule. Available on paid plans.`}
              </p>
              <Button href={upgradeUrl} fullWidth>
                {t`Upgrade`}
              </Button>
              <p className="mt-3 text-xs text-light-800 dark:text-dark-800">
                {t`14-day free trial · cancel anytime`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
