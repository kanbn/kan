import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { cardsToLabels } from "./cards";
import { imports } from "./imports";
import { users } from "./users";

export const labels = pgTable("label", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  colourCode: varchar("colourCode", { length: 12 }),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  boardId: bigint("boardId", { mode: "number" })
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  importId: bigint("importId", { mode: "number" }).references(() => imports.id),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id),
}).enableRLS();

export const labelsRelations = relations(labels, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [labels.createdBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [labels.deletedBy],
    references: [users.id],
  }),
  board: one(boards, {
    fields: [labels.boardId],
    references: [boards.id],
  }),
  cards: many(cardsToLabels),
  import: one(imports, {
    fields: [labels.importId],
    references: [imports.id],
  }),
}));
