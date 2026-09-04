import type { RouterInputs } from "~/utils/api";

type CustomFieldFilter = NonNullable<
  RouterInputs["board"]["byId"]["customFields"]
>[number];

export type CustomFieldFilterType = CustomFieldFilter["type"];
export type CheckboxFilterValue = Extract<
  CustomFieldFilter,
  { type: "checkbox" }
>["values"][number];

const isPublicId = (value: string) => value.length === 12;

export const encodeSelectFilter = (
  fieldPublicId: string,
  optionPublicId: string,
) => `${fieldPublicId}:select:${optionPublicId}`;

export const encodeCheckboxFilter = (
  fieldPublicId: string,
  value: CheckboxFilterValue,
) => `${fieldPublicId}:checkbox:${value}`;

export const parseCustomFieldFilters = (tokens: string[]) => {
  const filters = new Map<string, CustomFieldFilter>();

  for (const token of new Set(tokens)) {
    const [fieldPublicId, type, value, extra] = token.split(":");
    if (
      !fieldPublicId ||
      !type ||
      !value ||
      extra ||
      !isPublicId(fieldPublicId)
    )
      continue;

    if (type === "select" && isPublicId(value)) {
      const existing = filters.get(fieldPublicId);
      if (existing?.type === "select") {
        existing.optionPublicIds.push(value);
      } else if (!existing) {
        filters.set(fieldPublicId, {
          type,
          fieldPublicId,
          optionPublicIds: [value],
        });
      }
    }

    if (type === "checkbox" && (value === "checked" || value === "unchecked")) {
      const existing = filters.get(fieldPublicId);
      if (existing?.type === "checkbox") {
        existing.values.push(value);
      } else if (!existing) {
        filters.set(fieldPublicId, {
          type,
          fieldPublicId,
          values: [value],
        });
      }
    }
  }

  return [...filters.values()];
};
