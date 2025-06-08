import { relations } from "drizzle-orm";
import {
  bigserial,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const feedback = pgTable("feedback", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  feedback: text("feedback").notNull(),
  createdBy: uuid("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  url: text("url").notNull(),
  reviewed: boolean("reviewed").default(false).notNull(),
}).enableRLS();

export const feedbackRelations = relations(feedback, ({ one }) => ({
  createdBy: one(users, {
    fields: [feedback.createdBy],
    references: [users.id],
    relationName: "feedbackCreatedByUser",
  }),
}));
