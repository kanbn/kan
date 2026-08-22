import { load } from "js-yaml";
import { z } from "zod";

// ─── Field types ──────────────────────────────────────────────────────────────

export const CustomFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "richtext",
  "date",
  "datetime-local",
  "number",
  "tel",
  "select",
  "section",
  "address",
  "list",
  "timeseries",
  "keyvalue",
]);

export type CustomFieldType = z.infer<typeof CustomFieldTypeSchema>;

// ─── Field definition (recursive via z.lazy) ─────────────────────────────────

export interface CustomFieldDef {
  title: string;
  type: CustomFieldType;
  showOnBoard?: boolean;
  multiple?: boolean;
  style?: "checkbox" | "radio" | "dropdown" | "autofill";
  alwaysExpanded?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  description?: string;
  autofillLimit?: number;
  autofillFromCards?: boolean;
  default?: string | string[];
  options?: Record<string, string>;
  fields?: Record<string, CustomFieldDef>;
}

export const CustomFieldDefSchema: z.ZodType<CustomFieldDef> = z.lazy(() =>
  z.object({
    title: z.string(),
    type: CustomFieldTypeSchema,
    showOnBoard: z.boolean().optional(),
    multiple: z.boolean().optional(),
    style: z.enum(["checkbox", "radio", "dropdown", "autofill"]).optional(),
    alwaysExpanded: z.boolean().optional(),
    hideLabel: z.boolean().optional(),
    placeholder: z.string().optional(),
    description: z.string().optional(),
    autofillLimit: z.number().optional(),
    autofillFromCards: z.boolean().optional(),
    default: z.union([z.string(), z.array(z.string())]).optional(),
    options: z.record(z.string(), z.string()).optional(),
    fields: z.record(z.string(), CustomFieldDefSchema).optional(),
  }),
);

// ─── Built-in field override (only title is overridable) ─────────────────────

export const BuiltinFieldOverrideSchema = z.object({
  title: z.string().optional(),
  showOnBoard: z.boolean().optional(),
  placeholder: z.string().optional(),
});

export type BuiltinFieldOverride = z.infer<typeof BuiltinFieldOverrideSchema>;

// ─── main section ─────────────────────────────────────────────────────────────
// Supports overriding built-in field titles (description, etc.)
// AND adding custom fields/sections.

const MainFieldSchema = z.union([
  CustomFieldDefSchema,
  BuiltinFieldOverrideSchema,
]);

export const MainSectionSchema = z.object({
  newCardTitle: z.string().optional(),
  fields: z.record(z.string(), MainFieldSchema).optional(),
});

export type MainSection = z.infer<typeof MainSectionSchema>;

// ─── sidebar section ──────────────────────────────────────────────────────────
// Supports overriding built-in labels (list, labels, members, dueDate)
// AND adding custom fields/sections.

const SidebarFieldSchema = z.union([
  // Custom field
  CustomFieldDefSchema,
  // Built-in override (only has title/showOnBoard, no type)
  BuiltinFieldOverrideSchema,
]);

export const SidebarSectionSchema = z.object({
  fields: z.record(z.string(), SidebarFieldSchema).optional(),
});

export type SidebarSection = z.infer<typeof SidebarSectionSchema>;

// ─── Top-level custom section ─────────────────────────────────────────────────
// Any section key outside of main/sidebar is a custom section.

export const CustomTopLevelSectionSchema = z.object({
  title: z.string().optional(),
  type: z.enum(["section", "timeseries"]).optional(),
  fields: z.record(z.string(), CustomFieldDefSchema).optional(),
  alwaysExpanded: z.boolean().optional(),
});

export type CustomTopLevelSection = z.infer<typeof CustomTopLevelSectionSchema>;

// ─── Full config ──────────────────────────────────────────────────────────────

export const CustomFieldsConfigSchema = z
  .object({
    main: MainSectionSchema.optional(),
    sidebar: SidebarSectionSchema.optional(),
  })
  .catchall(CustomTopLevelSectionSchema);

export type CustomFieldsConfig = z.infer<typeof CustomFieldsConfigSchema>;

// ─── Parse + validate YAML ────────────────────────────────────────────────────

/**
 * Parse a YAML string into a validated CustomFieldsConfig.
 * Throws a descriptive error if the YAML is invalid or the schema does not match.
 */
export function parseCustomFieldsConfig(yaml: string): CustomFieldsConfig {
  let raw: unknown;

  try {
    raw = load(yaml);
  } catch (err) {
    throw new Error(
      `Custom fields config is not valid YAML: ${(err as Error).message}`,
    );
  }

  if (raw === null || raw === undefined) {
    return {};
  }

  const result = CustomFieldsConfigSchema.safeParse(raw);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join(".") ?? "unknown";
    const message = firstIssue?.message ?? "Unknown validation error";
    throw new Error(`Custom fields config error at "${path}": ${message}`);
  }

  return result.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns all custom sections (excludes the reserved main/sidebar keys).
 */
export function getCustomSections(
  config: CustomFieldsConfig,
): { key: string; section: CustomTopLevelSection }[] {
  return Object.entries(config)
    .filter(([key]) => key !== "main" && key !== "sidebar")
    .map(([key, section]) => ({
      key,
      section: section as CustomTopLevelSection,
    }));
}

/**
 * Returns sidebar custom fields (excludes the built-in keys).
 */
const BUILTIN_SIDEBAR_KEYS = new Set(["list", "labels", "members", "dueDate"]);

export function getSidebarCustomFields(
  config: CustomFieldsConfig,
): { key: string; field: CustomFieldDef }[] {
  const sidebar = config.sidebar;
  if (!sidebar?.fields) return [];

  return Object.entries(sidebar.fields)
    .filter(([key]) => !BUILTIN_SIDEBAR_KEYS.has(key))
    .filter(
      (entry): entry is [string, CustomFieldDef] =>
        "type" in (entry[1] as object),
    )
    .map(([key, field]) => ({ key, field }));
}

/**
 * Returns main custom fields (excludes the built-in keys).
 */
const BUILTIN_MAIN_KEYS = new Set(["id", "description", "title", "checklists"]);

export function getMainCustomFields(
  config: CustomFieldsConfig,
): { key: string; field: CustomFieldDef }[] {
  const main = config.main;
  if (!main?.fields) return [];

  return Object.entries(main.fields)
    .filter(([key]) => !BUILTIN_MAIN_KEYS.has(key))
    .filter(
      (entry): entry is [string, CustomFieldDef] =>
        "type" in (entry[1] as object),
    )
    .map(([key, field]) => ({ key, field }));
}

/**
 * Recursively collect all fields with showOnBoard: true from the entire config.
 */
export function getShowOnBoardFields(
  config: CustomFieldsConfig,
): { sectionKey: string; fieldKey: string; field: CustomFieldDef }[] {
  const results: {
    sectionKey: string;
    fieldKey: string;
    field: CustomFieldDef;
  }[] = [];

  function walkFields(
    sectionKey: string,
    fields: Record<string, CustomFieldDef>,
  ) {
    for (const [fieldKey, field] of Object.entries(fields)) {
      if (field.showOnBoard) {
        results.push({ sectionKey, fieldKey, field });
      }
      if (field.fields) {
        walkFields(sectionKey, field.fields);
      }
    }
  }

  // Check sidebar custom fields
  const sidebarCustom = getSidebarCustomFields(config);
  for (const { key, field } of sidebarCustom) {
    if (field.showOnBoard) {
      results.push({ sectionKey: "sidebar", fieldKey: key, field });
    }
    if (field.fields) {
      walkFields("sidebar", field.fields);
    }
  }

  // Check sidebar built-in overrides with showOnBoard
  const sidebar = config.sidebar;
  if (sidebar?.fields) {
    for (const [key, fieldOrOverride] of Object.entries(sidebar.fields)) {
      if (
        BUILTIN_SIDEBAR_KEYS.has(key) &&
        (fieldOrOverride as BuiltinFieldOverride).showOnBoard
      ) {
        // built-in sidebar fields with showOnBoard are already shown natively;
        // skip to avoid double-rendering
        continue;
      }
    }
  }

  // Check main-panel custom fields
  const mainCustom = getMainCustomFields(config);
  for (const { key, field } of mainCustom) {
    if (field.showOnBoard) {
      results.push({ sectionKey: "main", fieldKey: key, field });
    }
    if (field.fields) {
      walkFields("main", field.fields);
    }
  }

  // Check main-panel custom sections
  for (const { key: sectionKey, section } of getCustomSections(config)) {
    if (section.fields) {
      walkFields(sectionKey, section.fields);
    }
  }

  return results;
}

/**
 * Safely get a nested value from customData using a dot-separated path.
 */
export function getCustomDataValue(
  customData: Record<string, unknown> | null | undefined,
  sectionKey: string,
  fieldKey: string,
): unknown {
  if (!customData) return undefined;
  const section = customData[sectionKey];
  if (section === null || section === undefined) return undefined;
  if (typeof section === "object" && !Array.isArray(section)) {
    return (section as Record<string, unknown>)[fieldKey];
  }
  return undefined;
}
