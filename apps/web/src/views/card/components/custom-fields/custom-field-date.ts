import type { Locale } from "date-fns";
import { format } from "date-fns";

export const formatCustomFieldDate = (value: Date, dateLocale: Locale) =>
  format(value, "PPp", { locale: dateLocale });
