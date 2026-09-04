import type { Locale } from "date-fns";
import { t } from "@lingui/core/macro";
import { format } from "date-fns";

import type { RouterOutputs } from "~/utils/api";
import { useLocalisation } from "~/hooks/useLocalisation";

type Board = RouterOutputs["board"]["byId"];
type Definition = Board["customFields"][number];
type Value =
  Board["lists"][number]["cards"][number]["customFieldValues"][number];

const getDisplayValue = (
  definition: Definition,
  value: Value,
  dateLocale: Locale,
) => {
  switch (definition.type) {
    case "text":
      return value.textValue;
    case "number":
      return value.numberValue;
    case "date":
      return value.dateValue
        ? format(value.dateValue, "PP", { locale: dateLocale })
        : null;
    case "checkbox":
      return value.checkboxValue ? t`Checked` : t`Unchecked`;
    case "select":
      return value.optionName;
  }
};

export function CustomFieldBadges({
  definitions,
  values,
}: {
  definitions: Definition[];
  values: Value[];
}) {
  const { dateLocale } = useLocalisation();
  const valuesByFieldId = new Map(
    values.map((value) => [value.fieldPublicId, value]),
  );
  const visibleValues = definitions.flatMap((definition) => {
    const value = valuesByFieldId.get(definition.publicId);
    return definition.showOnCard && value ? [{ definition, value }] : [];
  });

  if (visibleValues.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {visibleValues.map(({ definition, value }) => (
        <div
          key={definition.publicId}
          className="flex min-w-0 max-w-full items-center gap-1.5 rounded bg-light-200 px-2 py-1 text-[11px] dark:bg-dark-400"
        >
          <span className="shrink-0 text-light-800 dark:text-dark-800">
            {definition.name}:
          </span>
          {definition.type === "select" && (
            <span
              className="h-2 w-2 shrink-0 rounded-full border border-black/10"
              style={{
                backgroundColor: value.optionColourCode ?? "transparent",
              }}
            />
          )}
          <span className="truncate text-light-1000 dark:text-dark-1000">
            {getDisplayValue(definition, value, dateLocale)}
            {value.optionArchivedAt ? ` (${t`Archived`})` : null}
          </span>
        </div>
      ))}
    </div>
  );
}
