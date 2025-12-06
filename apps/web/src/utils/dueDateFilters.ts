import { addDays, endOfDay, startOfDay } from "date-fns";

type DueDateFilterKey =
  | "overdue"
  | "today"
  | "tomorrow"
  | "next-week"
  | "next-month"
  | "no-due-date";

export interface DueDateFilter {
  startDate?: string;
  endDate?: string;
  hasNoDueDate?: boolean;
}

export const convertDueDateFiltersToRanges = (
  filters: DueDateFilterKey[],
): DueDateFilter[] => {
  if (!filters.length) return [];

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const nextWeekEnd = addDays(today, 8); // 7 days ahead
  const nextMonthEnd = addDays(today, 31); // 30 days ahead

  return filters.map((filter) => {
    switch (filter) {
      case "overdue":
        return {
          endDate: today.toISOString(),
        };
      case "today":
        return {
          startDate: today.toISOString(),
          endDate: endOfDay(today).toISOString(),
        };
      case "tomorrow":
        return {
          startDate: tomorrow.toISOString(),
          endDate: endOfDay(tomorrow).toISOString(),
        };
      case "next-week": {
        return {
          startDate: today.toISOString(),
          endDate: nextWeekEnd.toISOString(),
        };
      }
      case "next-month": {
        return {
          startDate: nextWeekEnd.toISOString(),
          endDate: nextMonthEnd.toISOString(),
        };
      }
      case "no-due-date":
        return {
          hasNoDueDate: true,
        };
      default:
        return {};
    }
  });
};
