import { addDays, endOfDay, startOfDay } from "date-fns";

export type DueDateFilterKey =
  | "overdue"
  | "today"
  | "tomorrow"
  | "next-week"
  | "next-month"
  | "no-due-date";

export interface DueDateFilter {
  startDate?: Date;
  endDate?: Date;
  hasNoDueDate?: boolean;
}

export const convertDueDateFiltersToRanges = (
  filters: DueDateFilterKey[],
): DueDateFilter[] => {
  if (!filters.length) return [];

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const nextWeekEnd = addDays(today, 8);
  const nextMonthEnd = addDays(today, 31);

  return filters.map((filter) => {
    switch (filter) {
      case "overdue":
        return {
          endDate: today,
        };
      case "today":
        return {
          startDate: today,
          endDate: endOfDay(today),
        };
      case "tomorrow":
        return {
          startDate: tomorrow,
          endDate: endOfDay(tomorrow),
        };
      case "next-week": {
        return {
          startDate: today,
          endDate: nextWeekEnd,
        };
      }
      case "next-month": {
        return {
          startDate: nextWeekEnd,
          endDate: nextMonthEnd,
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
