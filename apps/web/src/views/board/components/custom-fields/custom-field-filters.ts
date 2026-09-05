export type CustomFieldFilterType = "select" | "checkbox";
export type CheckboxFilterValue = "checked" | "unchecked";

export const encodeSelectFilter = (
  fieldPublicId: string,
  optionPublicId: string,
) => `${fieldPublicId}:select:${optionPublicId}`;

export const encodeCheckboxFilter = (
  fieldPublicId: string,
  value: CheckboxFilterValue,
) => `${fieldPublicId}:checkbox:${value}`;
