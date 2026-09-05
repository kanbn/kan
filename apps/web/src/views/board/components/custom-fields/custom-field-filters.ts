export type CustomFieldFilterType = "select" | "checkbox";
export type CheckboxFilterValue = "checked" | "unchecked";

export type ScalarCustomFieldFilter =
  | { type: "text"; contains: string }
  | {
      type: "number";
      operator: "equals";
      value: string;
    }
  | {
      type: "number";
      operator: "range";
      min?: string;
      max?: string;
    }
  | {
      type: "date";
      operator: "before" | "after";
      value: string;
    }
  | {
      type: "date";
      operator: "range";
      from?: string;
      to?: string;
    };

export const isValidCustomFieldNumberValue = (value: string) =>
  value.length <= 100 &&
  /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value);

const isCanonicalDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
};

export const encodeSelectFilter = (
  fieldPublicId: string,
  optionPublicId: string,
) => `${fieldPublicId}:select:${optionPublicId}`;

export const encodeCheckboxFilter = (
  fieldPublicId: string,
  value: CheckboxFilterValue,
) => `${fieldPublicId}:checkbox:${value}`;

const encodeValue = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};

const decodeValue = (value: string) => {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
  if (encodeValue(decoded) !== value) throw new Error("Invalid encoding");
  return decoded;
};

export const encodeScalarFilter = (
  fieldPublicId: string,
  filter: ScalarCustomFieldFilter,
) => {
  const token = (operator: string, value: string) =>
    `v1:${fieldPublicId}:${filter.type}:${operator}:${encodeValue(value)}`;

  if (filter.type === "text") return [token("contains", filter.contains)];
  if (filter.type === "number")
    return filter.operator === "equals"
      ? [token("eq", filter.value)]
      : [
          ...(filter.min === undefined ? [] : [token("min", filter.min)]),
          ...(filter.max === undefined ? [] : [token("max", filter.max)]),
        ];
  return filter.operator === "range"
    ? [
        ...(filter.from === undefined ? [] : [token("from", filter.from)]),
        ...(filter.to === undefined ? [] : [token("to", filter.to)]),
      ]
    : [token(filter.operator, filter.value)];
};

export const decodeScalarFilter = (
  fieldPublicId: string,
  tokens: string[],
): ScalarCustomFieldFilter | null => {
  const prefix = `v1:${fieldPublicId}:`;
  const values = new Map<string, string>();
  let type: ScalarCustomFieldFilter["type"] | null = null;

  try {
    for (const token of new Set(
      tokens.filter((token) => token.startsWith(prefix)),
    )) {
      const parts = token.split(":");
      if (parts.length !== 5) return null;
      const [, , tokenType, operator, encodedValue] = parts;
      if (
        (tokenType !== "text" &&
          tokenType !== "number" &&
          tokenType !== "date") ||
        operator === undefined ||
        encodedValue === undefined ||
        (type !== null && type !== tokenType) ||
        (tokenType === "text" && operator !== "contains") ||
        (tokenType === "number" &&
          operator !== "eq" &&
          operator !== "min" &&
          operator !== "max") ||
        (tokenType === "date" &&
          operator !== "before" &&
          operator !== "after" &&
          operator !== "from" &&
          operator !== "to") ||
        values.has(operator)
      )
        return null;
      type = tokenType;
      values.set(operator, decodeValue(encodedValue));
    }
  } catch {
    return null;
  }

  const contains = values.get("contains");
  if (
    type === "text" &&
    values.size === 1 &&
    contains !== undefined &&
    contains.length <= 255 &&
    contains.trim().length > 0
  )
    return { type, contains };
  if (type === "number") {
    const equals = values.get("eq");
    if (
      equals !== undefined &&
      values.size === 1 &&
      isValidCustomFieldNumberValue(equals)
    )
      return { type, operator: "equals", value: equals };
    const min = values.get("min");
    const max = values.get("max");
    if (
      (min !== undefined || max !== undefined) &&
      values.size <= 2 &&
      !values.has("eq") &&
      (min === undefined || isValidCustomFieldNumberValue(min)) &&
      (max === undefined || isValidCustomFieldNumberValue(max))
    )
      return {
        type,
        operator: "range",
        min,
        max,
      };
  }
  if (type === "date") {
    if (values.size === 1 && (values.has("before") || values.has("after"))) {
      const operator = values.has("before") ? "before" : "after";
      const value = values.get(operator);
      if (value !== undefined && isCanonicalDate(value))
        return { type, operator, value };
    }
    const from = values.get("from");
    const to = values.get("to");
    if (
      (from !== undefined || to !== undefined) &&
      values.size <= 2 &&
      !values.has("before") &&
      !values.has("after") &&
      (from === undefined || isCanonicalDate(from)) &&
      (to === undefined || isCanonicalDate(to))
    )
      return {
        type,
        operator: "range",
        from,
        to,
      };
  }
  return null;
};

export const replaceCustomFieldFilter = (
  tokens: string[],
  fieldPublicId: string,
  replacement: string[],
) => [
  ...tokens.filter(
    (token) =>
      !token.startsWith(`${fieldPublicId}:`) &&
      !token.startsWith(`v1:${fieldPublicId}:`),
  ),
  ...replacement,
];

export const countCustomFieldFilters = (tokens: string[]) =>
  new Set(
    tokens.map((token) =>
      token.startsWith("v1:") ? token.split(":")[1] : token.split(":")[0],
    ),
  ).size;
