import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

interface DateSelectorProps {
  selectedDate?: Date | null;
  onDateSelect?: (date: Date | undefined) => void;
  weekStartsOn?: 0 | 1 | 6;
}

const DateSelector = ({
  selectedDate,
  onDateSelect,
  weekStartsOn = 1,
}: DateSelectorProps) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date());
  });

  const monthName = format(currentMonth, "MMMM");
  const year = format(currentMonth, "yyyy");

  const dayHeaders = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn });
    return eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    }).map((date) => format(date, "EEEEEE")); // Shortest localized day name
  }, [weekStartsOn]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(
      (date) => {
        const dateString = format(date, "yyyy-MM-dd");
        return {
          date: dateString,
          isToday: isToday(date),
          isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
          isCurrentMonth: date >= monthStart && date <= monthEnd,
          dateObj: date,
        };
      },
    );
  }, [currentMonth, selectedDate, weekStartsOn]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    // If clicking the same date that's already selected, unselect it
    if (selectedDate && isSameDay(date, selectedDate)) {
      onDateSelect?.(undefined);
    } else {
      onDateSelect?.(date);
    }
  };

  return (
    <div className="w-[250px] p-4">
      <div className="flex items-center text-light-1000 dark:text-dark-1000">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="flex flex-none items-center justify-center p-1.5 text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-1000"
        >
          <span className="sr-only">Previous month</span>
          <HiChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center text-sm font-semibold">
          {monthName} {year}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex flex-none items-center justify-center p-1.5 text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-1000"
        >
          <span className="sr-only">Next month</span>
          <HiChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-6 grid grid-cols-7 text-center text-xs/6 text-light-950 dark:text-dark-950">
        {dayHeaders.map((day, index) => (
          <div key={index}>{day}</div>
        ))}
      </div>
      <div className="isolate mt-2 grid grid-cols-7 text-sm">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={(e) => handleDateClick(day.dateObj, e)}
            className={twMerge(
              "flex aspect-square items-center justify-center rounded-lg focus:z-10",
              day.isSelected
                ? "bg-light-1000 hover:bg-light-1000 dark:bg-dark-1000 dark:hover:bg-dark-1000"
                : "bg-transparent hover:bg-light-200 dark:bg-transparent dark:hover:bg-dark-200",
            )}
          >
            <time
              dateTime={day.date}
              className={twMerge(
                "mx-auto flex size-7 items-center justify-center rounded-full text-light-900 dark:text-dark-900",
                day.isCurrentMonth
                  ? "text-light-900 dark:text-dark-900"
                  : "text-light-700 dark:text-dark-600",
                day.isSelected && "text-light-50 dark:text-dark-50",
              )}
            >
              {day.date.split("-").pop()?.replace(/^0/, "")}
            </time>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateSelector;
