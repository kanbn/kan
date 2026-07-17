import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { cards } from "./cards";
import { users } from "./users";

export const checklists = pgTable("card_checklist", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  index: integer("index").notNull(),
  cardId: bigint("cardId", { mode: "number" })
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
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

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  card: one(cards, {
    fields: [checklists.cardId],
    references: [cards.id],
    relationName: "checklistsCard",
  }),
  createdBy: one(users, {
    fields: [checklists.createdBy],
    references: [users.id],
    relationName: "checklistsCreatedByUser",
  }),
  deletedBy: one(users, {
    fields: [checklists.deletedBy],
    references: [users.id],
    relationName: "checklistsDeletedByUser",
  }),
  items: many(checklistItems),
}));

export const checklistItems = pgTable("card_checklist_item", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  index: integer("index").notNull(),
  checklistId: bigint("checklistId", { mode: "number" })
    .notNull()
    .references(() => checklists.id, { onDelete: "cascade" }),
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

export const checklistItemsRelations = relations(
  checklistItems,
  ({ one, many }) => ({
    checklist: one(checklists, {
      fields: [checklistItems.checklistId],
      references: [checklists.id],
      relationName: "checklistItemsChecklist",
    }),
    createdBy: one(users, {
      fields: [checklistItems.createdBy],
      references: [users.id],
      relationName: "checklistItemsCreatedByUser",
    }),
    deletedBy: one(users, {
      fields: [checklistItems.deletedBy],
      references: [users.id],
      relationName: "checklistItemsDeletedByUser",
    }),
    blockedBy: many(checklistItemBlocking, {
      relationName: "checklistItemBlockedBy",
    }),
  }),
);

export const checklistItemBlocking = pgTable(
  "_checklist_item_blocking",
  {
    checklistItemId: bigint("checklistItemId", { mode: "number" })
      .notNull()
      .references(() => checklistItems.id, { onDelete: "cascade" }),
    blockerCardId: bigint("blockerCardId", { mode: "number" })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.checklistItemId, t.blockerCardId] })],
).enableRLS();

export const checklistItemBlockingRelations = relations(
  checklistItemBlocking,
  ({ one }) => ({
    checklistItem: one(checklistItems, {
      fields: [checklistItemBlocking.checklistItemId],
      references: [checklistItems.id],
      relationName: "checklistItemBlockedBy",
    }),
    blocker: one(cards, {
      fields: [checklistItemBlocking.blockerCardId],
      references: [cards.id],
      relationName: "checklistItemBlockingBlocker",
    }),
  }),
);
