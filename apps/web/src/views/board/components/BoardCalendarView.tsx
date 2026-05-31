import Link from "next/link";
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
import { useMemo, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { getAvatarUrl } from "~/utils/helpers";

interface CalendarCard {
  publicId: string;
  title: string;
  dueDate: Date;
  listName: string;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
}

interface BoardCalendarViewProps {
  boardPublicId: string;
  isTemplate: boolean;
  lists: {
    publicId: string;
    name: string;
    cards: {
      publicId: string;
      title: string;
      dueDate: Date | null;
      labels: { name: string; colourCode: string | null }[];
      members: {
        publicId: string;
        email: string;
        user: {
          name: string | null;
          email: string;
          image: string | null;
        } | null;
      }[];
    }[];
  }[];
}

export function BoardCalendarView({
  boardPublicId,
  isTemplate,
  lists,
}: BoardCalendarViewProps) {
  const { dateLocale } = useLocalisation();
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );

  const cardsWithDueDate = useMemo<CalendarCard[]>(() => {
    return lists
      .flatMap((list) =>
        list.cards
          .filter(
            (
              card,
            ): card is typeof card & {
              dueDate: Date;
            } => card.dueDate !== null,
          )
          .map((card) => ({
            publicId: card.publicId,
            title: card.title,
            dueDate: card.dueDate,
            listName: list.name,
            labels: card.labels,
            members: card.members,
          })),
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [lists]);

  const cardsByDay = useMemo(() => {
    return cardsWithDueDate.reduce<Record<string, CalendarCard[]>>(
      (acc, card) => {
        const key = format(card.dueDate, "yyyy-MM-dd");
        acc[key] = acc[key] ? [...acc[key], card] : [card];
        return acc;
      },
      {},
    );
  }, [cardsWithDueDate]);

  const dayHeaders = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    }).map((date) => format(date, "EEEEEE", { locale: dateLocale }));
  }, [dateLocale]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const weeksInView = days.length / 7;

  const moveMonth = (direction: "next" | "prev") => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1),
    );
  };

  if (!cardsWithDueDate.length) {
    return (
      <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-2 pb-[150px]">
        <p className="text-[14px] font-bold text-light-1000 dark:text-dark-950">
          {t`No due dates yet`}
        </p>
        <p className="text-[14px] text-light-900 dark:text-dark-900">
          {t`Add due dates to cards to see them in calendar view.`}
        </p>
      </div>
    );
  }

  return (
    <div className="z-10 mx-6 mb-6 flex h-[calc(100vh-220px)] min-h-[520px] flex-col rounded-xl border border-light-300 bg-light-50 p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100 md:mx-8 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth("prev")}
          className="rounded-md p-2 text-light-800 hover:bg-light-200 dark:text-dark-800 dark:hover:bg-dark-200"
          aria-label={t`Previous month`}
        >
          <HiChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold text-light-1000 dark:text-dark-1000">
          {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
        </div>
        <button
          type="button"
          onClick={() => moveMonth("next")}
          className="rounded-md p-2 text-light-800 hover:bg-light-200 dark:text-dark-800 dark:hover:bg-dark-200"
          aria-label={t`Next month`}
        >
          <HiChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-light-900 dark:text-dark-900">
        {dayHeaders.map((day, index) => (
          <div key={`${day}-${index}`}>{day}</div>
        ))}
      </div>

      <div
        className="mt-2 grid min-h-0 flex-1 grid-cols-7 gap-2"
        style={{
          gridTemplateRows: `repeat(${weeksInView}, minmax(0, 1fr))`,
        }}
      >
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dueCards = cardsByDay[key] ?? [];

          return (
            <div
              key={key}
              className={twMerge(
                "min-h-0 overflow-hidden rounded-lg border p-1.5",
                isSameMonth(day, currentMonth)
                  ? "border-light-300 bg-light-100 dark:border-dark-300 dark:bg-dark-200"
                  : "border-light-200 bg-light-50/50 dark:border-dark-200 dark:bg-dark-100/50",
                isToday(day) &&
                  "border-light-800 ring-1 ring-light-700/20 dark:border-dark-700 dark:ring-dark-700/30",
              )}
            >
              <div
                className={twMerge(
                  "mb-2 text-xs font-semibold",
                  isSameMonth(day, currentMonth)
                    ? "text-light-1000 dark:text-dark-1000"
                    : "text-light-700 dark:text-dark-700",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dueCards.slice(0, 2).map((card) => (
                  <Link
                    key={card.publicId}
                    href={
                      isTemplate
                        ? `/templates/${boardPublicId}/cards/${card.publicId}`
                        : `/cards/${card.publicId}`
                    }
                    className={twMerge(
                      "block rounded px-1.5 py-1",
                      isSameDay(card.dueDate, new Date())
                        ? "bg-blue-200 text-blue-900 dark:bg-blue-500/30 dark:text-blue-100"
                        : "bg-light-200 text-light-1000 hover:bg-light-300 dark:bg-dark-300 dark:text-dark-1000 dark:hover:bg-dark-400",
                    )}
                    title={`${card.title} (${card.listName})`}
                  >
                    <p className="truncate text-[11px] font-medium">
                      {card.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <div className="-space-x-0.5 flex items-center">
                        {card.labels.slice(0, 3).map((label, index) => (
                          <span
                            key={`${card.publicId}-label-${index}`}
                            className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-light-50 dark:bg-dark-100"
                            title={label.name}
                          >
                            <LabelIcon colourCode={label.colourCode} />
                          </span>
                        ))}
                        {card.labels.length > 3 ? (
                          <span className="pl-1 text-[9px] text-light-900 dark:text-dark-900">
                            +{card.labels.length - 3}
                          </span>
                        ) : null}
                      </div>

                      <div className="-space-x-1 flex items-center">
                        {card.members.slice(0, 2).map((member) => (
                          <Avatar
                            key={`${card.publicId}-${member.publicId}`}
                            size="xs"
                            name={member.user?.name ?? ""}
                            email={member.user?.email ?? member.email}
                            imageUrl={
                              member.user?.image
                                ? getAvatarUrl(member.user.image)
                                : undefined
                            }
                          />
                        ))}
                        {card.members.length > 2 ? (
                          <span className="pl-1 text-[9px] text-light-900 dark:text-dark-900">
                            +{card.members.length - 2}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
                {dueCards.length > 2 ? (
                  <p className="px-2 text-[11px] text-light-800 dark:text-dark-800">
                    +{dueCards.length - 2} {t`more`}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
