import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  date,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { cards } from "./cards";
import { users } from "./users";
import { workspaceMembers } from "./workspaces";

// Field types supported by the custom fields system
export const fieldTypes = [
  "text",
  "link", 
  "date",
  "checkbox",
  "emoji",
  "user",
] as const;

export type FieldType = (typeof fieldTypes)[number];
export const fieldTypeEnum = pgEnum("custom_field_type", fieldTypes);

// Custom field definitions - defines the structure of a custom field for a board
export const customFieldDefinitions = pgTable("custom_field_definition", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: fieldTypeEnum("type").notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  boardId: bigint("boardId", { mode: "number" })
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  createdBy: uuid("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id, {
    onDelete: "set null",
  }),
}).enableRLS();

export const customFieldDefinitionsRelations = relations(
  customFieldDefinitions,
  ({ one, many }) => ({
    board: one(boards, {
      fields: [customFieldDefinitions.boardId],
      references: [boards.id],
      relationName: "customFieldDefinitionsBoard",
    }),
    createdBy: one(users, {
      fields: [customFieldDefinitions.createdBy],
      references: [users.id],
      relationName: "customFieldDefinitionsCreatedByUser",
    }),
    deletedBy: one(users, {
      fields: [customFieldDefinitions.deletedBy],
      references: [users.id],
      relationName: "customFieldDefinitionsDeletedByUser",
    }),
    values: many(customFieldValues),
  })
);

// Custom field values - stores the actual values for each card's custom fields
export const customFieldValues = pgTable("custom_field_value", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  cardId: bigint("cardId", { mode: "number" })
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  fieldDefinitionId: bigint("fieldDefinitionId", { mode: "number" })
    .notNull()
    .references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
  
  // Value storage - only one of these should be populated based on field type
  textValue: text("textValue"),
  linkValue: text("linkValue"),
  dateValue: date("dateValue"),
  checkboxValue: boolean("checkboxValue"),
  emojiValue: varchar("emojiValue", { length: 10 }),
  userValue: bigint("userValue", { mode: "number" }).references(
    () => workspaceMembers.id,
    { onDelete: "set null" }
  ),
  
  createdBy: uuid("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id, {
    onDelete: "set null",
  }),
}).enableRLS();

export const customFieldValuesRelations = relations(
  customFieldValues,
  ({ one }) => ({
    card: one(cards, {
      fields: [customFieldValues.cardId],
      references: [cards.id],
      relationName: "customFieldValuesCard",
    }),
    fieldDefinition: one(customFieldDefinitions, {
      fields: [customFieldValues.fieldDefinitionId],
      references: [customFieldDefinitions.id],
      relationName: "customFieldValuesDefinition",
    }),
    createdBy: one(users, {
      fields: [customFieldValues.createdBy],
      references: [users.id],
      relationName: "customFieldValuesCreatedByUser",
    }),
    deletedBy: one(users, {
      fields: [customFieldValues.deletedBy],
      references: [users.id],
      relationName: "customFieldValuesDeletedByUser",
    }),
    userValue: one(workspaceMembers, {
      fields: [customFieldValues.userValue],
      references: [workspaceMembers.id],
      relationName: "customFieldValuesUserValue",
    }),
  })
);
