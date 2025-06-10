import { relations } from "drizzle-orm";
import {
  bigserial,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { cards } from "./cards";
import { labels } from "./labels";
import { lists } from "./lists";
import { users } from "./users";

export const importSourceEnum = pgEnum("source", ["trello"]);
export const importStatusEnum = pgEnum("status", [
  "started",
  "success",
  "failed",
]);

export const imports = pgTable("import", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  source: importSourceEnum("source").notNull(),
  status: importStatusEnum("status").notNull(),
  createdBy: uuid("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();

export const importsRelations = relations(imports, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [imports.createdBy],
    references: [users.id],
    relationName: "importsCreatedByUser",
  }),
  boards: many(boards),
  cards: many(cards),
  lists: many(lists),
  labels: many(labels),
}));
