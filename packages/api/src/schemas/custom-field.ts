import { z } from "zod";

export const customFieldPublicIdSchema = z.string().length(12);
export const customFieldNameSchema = z.string().trim().min(1).max(255);
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

export const customFieldDefinitionSchema = z.object({
  publicId: customFieldPublicIdSchema,
  name: customFieldNameSchema,
  type: z.enum(["text", "number", "date", "checkbox", "select"]),
  position: z.number().int().nonnegative(),
  showOnCard: z.boolean(),
  options: z.array(customFieldOptionSchema),
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

export const customFieldFilterSchema = z.discriminatedUnion("type", [
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

// trpc-to-openapi normalizes a single query parameter value to a string.
export const customFieldFilterTokensSchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z
    .array(
      z
        .string()
        .max(43)
        .regex(
          /^[A-Za-z0-9_-]{12}:(?:select:[A-Za-z0-9_-]{12}|checkbox:(?:checked|unchecked))$/,
        ),
    )
    .max(2500),
) as z.ZodType<string[], z.ZodTypeDef, string | string[]>;

export const parseCustomFieldFilterTokens = (tokens: string[]) => {
  const filters = new Map<string, z.infer<typeof customFieldFilterSchema>>();

  for (const token of new Set(customFieldFilterTokensSchema.parse(tokens))) {
    const [fieldPublicId, type, value] = token.split(":") as [
      string,
      "select" | "checkbox",
      string,
    ];
    const key = `${fieldPublicId}:${type}`;
    const existing = filters.get(key);

    if (type === "select") {
      if (existing?.type === "select") existing.optionPublicIds.push(value);
      else
        filters.set(key, {
          type,
          fieldPublicId,
          optionPublicIds: [value],
        });
    } else {
      const checkboxValue = value as "checked" | "unchecked";
      if (existing?.type === "checkbox") existing.values.push(checkboxValue);
      else
        filters.set(key, {
          type,
          fieldPublicId,
          values: [checkboxValue],
        });
    }
  }

  return customFieldFiltersSchema.parse([...filters.values()]);
};
