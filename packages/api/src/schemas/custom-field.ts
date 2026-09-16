import { z } from "zod";

export const customFieldPublicIdSchema = z.string().length(12);
export const customFieldNameSchema = z.string().trim().min(1).max(255);
export const customFieldDescriptionSchema = z.string().trim().max(2000);
export const customFieldPlaceholderSchema = z.string().trim().max(255);
export const customFieldSectionLabelSchema = z.string().trim().min(1).max(255);
export const customFieldPlacementSchema = z.enum(["main", "sidebar"]);
export const customFieldColourCodeSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable();
export const customFieldNumberValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/);

export const customFieldOptionSchema = z.object({
  publicId: customFieldPublicIdSchema,
  name: customFieldNameSchema,
  colourCode: customFieldColourCodeSchema,
  position: z.number().int().nonnegative(),
  isArchived: z.boolean(),
});

export const customFieldValueInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), value: z.string().min(1).max(10000) }),
  z.object({ type: z.literal("number"), value: customFieldNumberValueSchema }),
  z.object({ type: z.literal("date"), value: z.date() }),
  z.object({ type: z.literal("checkbox"), value: z.boolean() }),
  z.object({
    type: z.literal("select"),
    optionPublicId: customFieldPublicIdSchema,
  }),
]);

export const customFieldDefinitionSchema = z.object({
  publicId: customFieldPublicIdSchema,
  name: customFieldNameSchema,
  description: customFieldDescriptionSchema.nullable(),
  placeholder: customFieldPlaceholderSchema.nullable(),
  sectionLabel: customFieldSectionLabelSchema.nullable(),
  placement: customFieldPlacementSchema,
  type: z.enum(["text", "number", "date", "checkbox", "select"]),
  position: z.number().int().nonnegative(),
  showOnCard: z.boolean(),
  options: z.array(customFieldOptionSchema),
  defaultValue: customFieldValueInputSchema.nullable(),
});

export const customFieldValueSchema = z.object({
  publicId: customFieldPublicIdSchema,
  fieldPublicId: customFieldPublicIdSchema,
  fieldType: z.enum(["text", "number", "date", "checkbox", "select"]),
  textValue: z.string().nullable(),
  numberValue: z.string().nullable(),
  dateValue: z.date().nullable(),
  checkboxValue: z.boolean().nullable(),
  optionPublicId: customFieldPublicIdSchema.nullable(),
  optionName: z.string().nullable(),
  optionColourCode: z.string().nullable(),
  optionArchivedAt: z.date().nullable(),
});

const customFieldTextFilterSchema = z.object({
  type: z.literal("text"),
  fieldPublicId: customFieldPublicIdSchema,
  contains: z
    .string()
    .max(255)
    .refine((value) => value.trim().length > 0),
});

const customFieldNumberFilterSchema = z.union([
  z.object({
    type: z.literal("number"),
    fieldPublicId: customFieldPublicIdSchema,
    operator: z.literal("equals"),
    value: customFieldNumberValueSchema,
  }),
  z
    .object({
      type: z.literal("number"),
      fieldPublicId: customFieldPublicIdSchema,
      operator: z.literal("range"),
      min: customFieldNumberValueSchema.optional(),
      max: customFieldNumberValueSchema.optional(),
    })
    .refine((filter) => filter.min !== undefined || filter.max !== undefined),
]);

const customFieldDateFilterSchema = z.union([
  z.object({
    type: z.literal("date"),
    fieldPublicId: customFieldPublicIdSchema,
    operator: z.enum(["before", "after"]),
    value: z.date(),
  }),
  z
    .object({
      type: z.literal("date"),
      fieldPublicId: customFieldPublicIdSchema,
      operator: z.literal("range"),
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .refine((filter) => filter.from !== undefined || filter.to !== undefined),
]);

export const customFieldFilterSchema = z.union([
  customFieldTextFilterSchema,
  customFieldNumberFilterSchema,
  customFieldDateFilterSchema,
  z.object({
    type: z.literal("select"),
    fieldPublicId: customFieldPublicIdSchema,
    optionPublicIds: z
      .array(customFieldPublicIdSchema)
      .min(1)
      .max(50)
      .refine((values) => new Set(values).size === values.length),
  }),
  z.object({
    type: z.literal("checkbox"),
    fieldPublicId: customFieldPublicIdSchema,
    values: z
      .array(z.enum(["checked", "unchecked"]))
      .min(1)
      .max(2)
      .refine((values) => new Set(values).size === values.length),
  }),
]);

export const customFieldFiltersSchema = z
  .array(customFieldFilterSchema)
  .max(50)
  .refine(
    (filters) =>
      new Set(filters.map((filter) => filter.fieldPublicId)).size ===
      filters.length,
  );

const legacyCustomFieldFilterTokenSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]{12}:(?:select:[A-Za-z0-9_-]{12}|checkbox:(?:checked|unchecked))$/,
  );
const scalarCustomFieldFilterTokenSchema = z
  .string()
  .regex(
    /^v1:[A-Za-z0-9_-]{12}:(?:text:contains|number:(?:eq|min|max)|date:(?:before|after|from|to)):[A-Za-z0-9_-]+$/,
  );

// trpc-to-openapi normalizes a single query parameter value to a string.
export const customFieldFilterTokensSchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z
    .array(
      z
        .union([
          legacyCustomFieldFilterTokenSchema,
          scalarCustomFieldFilterTokenSchema,
        ])
        .refine((value) => value.length <= 2048),
    )
    .max(2500),
) as z.ZodType<string[], z.ZodTypeDef, string | string[]>;

const canonicalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .transform((value, context) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date",
      });
      return z.NEVER;
    }
    return date;
  });

const decodeFilterValue = (value: string) => {
  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) throw new Error("Invalid token");
  const text = decoded.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(decoded))
    throw new Error("Invalid token");
  return text;
};

export const parseCustomFieldFilterTokens = (tokens: string[]) => {
  const legacyFilters = new Map<
    string,
    z.infer<typeof customFieldFilterSchema>
  >();
  const scalarTokens = new Map<
    string,
    { type: "text" | "number" | "date"; values: Map<string, string> }
  >();

  for (const token of new Set(customFieldFilterTokensSchema.parse(tokens))) {
    if (token.startsWith("v1:")) {
      scalarCustomFieldFilterTokenSchema.parse(token);
      const [, fieldPublicId, type, operator, encodedValue] = token.split(
        ":",
      ) as [string, string, "text" | "number" | "date", string, string];
      const existing = scalarTokens.get(fieldPublicId);
      if (existing && existing.type !== type) throw new Error("Invalid token");
      const filter = existing ?? { type, values: new Map<string, string>() };
      if (filter.values.has(operator)) throw new Error("Invalid token");
      filter.values.set(operator, decodeFilterValue(encodedValue));
      scalarTokens.set(fieldPublicId, filter);
      continue;
    }

    legacyCustomFieldFilterTokenSchema.parse(token);
    const [fieldPublicId, type, value] = token.split(":") as [
      string,
      "select" | "checkbox",
      string,
    ];
    const existing = legacyFilters.get(fieldPublicId);
    if (existing && existing.type !== type) throw new Error("Invalid token");

    if (type === "select") {
      if (existing?.type === "select") existing.optionPublicIds.push(value);
      else
        legacyFilters.set(fieldPublicId, {
          type,
          fieldPublicId,
          optionPublicIds: [value],
        });
    } else {
      const checkboxValue = value as "checked" | "unchecked";
      if (existing?.type === "checkbox") existing.values.push(checkboxValue);
      else
        legacyFilters.set(fieldPublicId, {
          type,
          fieldPublicId,
          values: [checkboxValue],
        });
    }
  }

  const scalarFilters = [...scalarTokens].map(
    ([fieldPublicId, { type, values }]) => {
      if (legacyFilters.has(fieldPublicId)) throw new Error("Invalid token");
      if (type === "text") {
        if (values.size !== 1 || !values.has("contains"))
          throw new Error("Invalid token");
        return { type, fieldPublicId, contains: values.get("contains") };
      }
      if (type === "number") {
        const equals = values.get("eq");
        if (equals !== undefined) {
          if (values.size !== 1) throw new Error("Invalid token");
          return { type, fieldPublicId, operator: "equals", value: equals };
        }
        return {
          type,
          fieldPublicId,
          operator: "range",
          min: values.get("min"),
          max: values.get("max"),
        };
      }

      const before = values.get("before");
      const after = values.get("after");
      if (before !== undefined || after !== undefined) {
        if (values.size !== 1) throw new Error("Invalid token");
        return {
          type,
          fieldPublicId,
          operator: before === undefined ? "after" : "before",
          value: canonicalDateSchema.parse(before ?? after),
        };
      }
      return {
        type,
        fieldPublicId,
        operator: "range",
        from:
          values.get("from") === undefined
            ? undefined
            : canonicalDateSchema.parse(values.get("from")),
        to:
          values.get("to") === undefined
            ? undefined
            : canonicalDateSchema.parse(values.get("to")),
      };
    },
  );

  return customFieldFiltersSchema.parse([
    ...legacyFilters.values(),
    ...scalarFilters,
  ]);
};
