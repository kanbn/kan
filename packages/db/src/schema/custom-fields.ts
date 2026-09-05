import { relations, sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { cards } from "./cards";
import { imports } from "./imports";
import { users } from "./users";

export const customFieldTypes = [
  "text",
  "number",
  "date",
  "checkbox",
  "select",
] as const;
export type CustomFieldType = (typeof customFieldTypes)[number];
export const customFieldTypeEnum = pgEnum(
  "custom_field_type",
  customFieldTypes,
);

export const customFields = pgTable(
  "custom_field",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    boardId: bigint("boardId", { mode: "number" })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: customFieldTypeEnum("type").notNull(),
    position: integer("position").notNull(),
    showOnCard: boolean("showOnCard").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updatedAt"),
    updatedBy: uuid("updatedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deletedAt"),
    deletedBy: uuid("deletedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    importId: bigint("importId", { mode: "number" }).references(
      () => imports.id,
    ),
  },
  (table) => [
    index("custom_field_board_position_idx")
      .on(table.boardId, table.position)
      .where(sql`${table.deletedAt} IS NULL`),
    unique("custom_field_id_type_unique").on(table.id, table.type),
    unique("custom_field_id_board_unique").on(table.id, table.boardId),
  ],
).enableRLS();

export const customFieldOptions = pgTable(
  "custom_field_option",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    customFieldId: bigint("customFieldId", { mode: "number" })
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    colourCode: varchar("colourCode", { length: 12 }),
    position: integer("position").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updatedAt"),
    updatedBy: uuid("updatedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deletedAt"),
    deletedBy: uuid("deletedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    importId: bigint("importId", { mode: "number" }).references(
      () => imports.id,
    ),
  },
  (table) => [
    index("custom_field_option_field_position_idx")
      .on(table.customFieldId, table.position)
      .where(sql`${table.deletedAt} IS NULL`),
    unique("custom_field_option_id_field_unique").on(
      table.id,
      table.customFieldId,
    ),
  ],
).enableRLS();

export const cardCustomFieldValues = pgTable(
  "card_custom_field_value",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    cardId: bigint("cardId", { mode: "number" })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    customFieldId: bigint("customFieldId", { mode: "number" }).notNull(),
    fieldType: customFieldTypeEnum("fieldType").notNull(),
    optionId: bigint("optionId", { mode: "number" }),
    textValue: text("textValue"),
    numberValue: numeric("numberValue"),
    dateValue: timestamp("dateValue", { withTimezone: true }),
    checkboxValue: boolean("checkboxValue"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updatedAt"),
    updatedBy: uuid("updatedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    importId: bigint("importId", { mode: "number" }).references(
      () => imports.id,
    ),
  },
  (table) => [
    unique("card_custom_field_value_card_field_unique").on(
      table.cardId,
      table.customFieldId,
    ),
    foreignKey({
      name: "card_custom_field_value_field_type_fk",
      columns: [table.customFieldId, table.fieldType],
      foreignColumns: [customFields.id, customFields.type],
    }).onDelete("cascade"),
    foreignKey({
      name: "card_custom_field_value_option_field_fk",
      columns: [table.optionId, table.customFieldId],
      foreignColumns: [customFieldOptions.id, customFieldOptions.customFieldId],
    }),
    check(
      "card_custom_field_value_shape_check",
      sql`(
        ${table.fieldType} = 'text'
        AND ${table.textValue} IS NOT NULL
        AND ${table.numberValue} IS NULL
        AND ${table.dateValue} IS NULL
        AND ${table.checkboxValue} IS NULL
        AND ${table.optionId} IS NULL
      ) OR (
        ${table.fieldType} = 'number'
        AND ${table.textValue} IS NULL
        AND ${table.numberValue} IS NOT NULL
        AND ${table.dateValue} IS NULL
        AND ${table.checkboxValue} IS NULL
        AND ${table.optionId} IS NULL
      ) OR (
        ${table.fieldType} = 'date'
        AND ${table.textValue} IS NULL
        AND ${table.numberValue} IS NULL
        AND ${table.dateValue} IS NOT NULL
        AND ${table.checkboxValue} IS NULL
        AND ${table.optionId} IS NULL
      ) OR (
        ${table.fieldType} = 'checkbox'
        AND ${table.textValue} IS NULL
        AND ${table.numberValue} IS NULL
        AND ${table.dateValue} IS NULL
        AND ${table.checkboxValue} IS NOT NULL
        AND ${table.optionId} IS NULL
      ) OR (
        ${table.fieldType} = 'select'
        AND ${table.textValue} IS NULL
        AND ${table.numberValue} IS NULL
        AND ${table.dateValue} IS NULL
        AND ${table.checkboxValue} IS NULL
        AND ${table.optionId} IS NOT NULL
      )`,
    ),
    index("card_custom_field_value_field_option_idx")
      .on(table.customFieldId, table.optionId)
      .where(sql`${table.optionId} IS NOT NULL`),
    index("card_custom_field_value_field_checkbox_idx")
      .on(table.customFieldId, table.checkboxValue)
      .where(sql`${table.checkboxValue} IS NOT NULL`),
  ],
).enableRLS();

export const customFieldMappings = pgTable(
  "custom_field_mapping",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceFieldId: bigint("sourceFieldId", { mode: "number" })
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    targetBoardId: bigint("targetBoardId", { mode: "number" })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    targetFieldId: bigint("targetFieldId", { mode: "number" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("custom_field_mapping_source_board_unique").on(
      table.sourceFieldId,
      table.targetBoardId,
    ),
    foreignKey({
      name: "custom_field_mapping_target_field_board_fk",
      columns: [table.targetFieldId, table.targetBoardId],
      foreignColumns: [customFields.id, customFields.boardId],
    }).onDelete("cascade"),
  ],
).enableRLS();

export const customFieldOptionMappings = pgTable(
  "custom_field_option_mapping",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceOptionId: bigint("sourceOptionId", { mode: "number" })
      .notNull()
      .references(() => customFieldOptions.id, { onDelete: "cascade" }),
    targetFieldId: bigint("targetFieldId", { mode: "number" })
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    targetOptionId: bigint("targetOptionId", { mode: "number" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("custom_field_option_mapping_source_field_unique").on(
      table.sourceOptionId,
      table.targetFieldId,
    ),
    foreignKey({
      name: "custom_field_option_mapping_target_option_field_fk",
      columns: [table.targetOptionId, table.targetFieldId],
      foreignColumns: [customFieldOptions.id, customFieldOptions.customFieldId],
    }).onDelete("cascade"),
  ],
).enableRLS();

export const customFieldsRelations = relations(
  customFields,
  ({ one, many }) => ({
    board: one(boards, {
      fields: [customFields.boardId],
      references: [boards.id],
    }),
    options: many(customFieldOptions),
    values: many(cardCustomFieldValues),
    createdByUser: one(users, {
      fields: [customFields.createdBy],
      references: [users.id],
      relationName: "customFieldsCreatedByUser",
    }),
    updatedByUser: one(users, {
      fields: [customFields.updatedBy],
      references: [users.id],
      relationName: "customFieldsUpdatedByUser",
    }),
    deletedByUser: one(users, {
      fields: [customFields.deletedBy],
      references: [users.id],
      relationName: "customFieldsDeletedByUser",
    }),
    import: one(imports, {
      fields: [customFields.importId],
      references: [imports.id],
      relationName: "customFieldsImport",
    }),
  }),
);

export const customFieldOptionsRelations = relations(
  customFieldOptions,
  ({ one, many }) => ({
    customField: one(customFields, {
      fields: [customFieldOptions.customFieldId],
      references: [customFields.id],
    }),
    values: many(cardCustomFieldValues),
    createdByUser: one(users, {
      fields: [customFieldOptions.createdBy],
      references: [users.id],
      relationName: "customFieldOptionsCreatedByUser",
    }),
    updatedByUser: one(users, {
      fields: [customFieldOptions.updatedBy],
      references: [users.id],
      relationName: "customFieldOptionsUpdatedByUser",
    }),
    deletedByUser: one(users, {
      fields: [customFieldOptions.deletedBy],
      references: [users.id],
      relationName: "customFieldOptionsDeletedByUser",
    }),
    import: one(imports, {
      fields: [customFieldOptions.importId],
      references: [imports.id],
      relationName: "customFieldOptionsImport",
    }),
  }),
);

export const cardCustomFieldValuesRelations = relations(
  cardCustomFieldValues,
  ({ one }) => ({
    card: one(cards, {
      fields: [cardCustomFieldValues.cardId],
      references: [cards.id],
    }),
    customField: one(customFields, {
      fields: [cardCustomFieldValues.customFieldId],
      references: [customFields.id],
    }),
    option: one(customFieldOptions, {
      fields: [cardCustomFieldValues.optionId],
      references: [customFieldOptions.id],
    }),
    createdByUser: one(users, {
      fields: [cardCustomFieldValues.createdBy],
      references: [users.id],
      relationName: "cardCustomFieldValuesCreatedByUser",
    }),
    updatedByUser: one(users, {
      fields: [cardCustomFieldValues.updatedBy],
      references: [users.id],
      relationName: "cardCustomFieldValuesUpdatedByUser",
    }),
    import: one(imports, {
      fields: [cardCustomFieldValues.importId],
      references: [imports.id],
      relationName: "cardCustomFieldValuesImport",
    }),
  }),
);
