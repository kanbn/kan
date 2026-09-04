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
