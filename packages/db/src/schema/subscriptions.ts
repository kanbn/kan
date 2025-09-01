import { relations } from "drizzle-orm";
import {
  bigserial,
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const subscription = pgTable("subscription", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  plan: varchar("plan", { length: 255 }).notNull(),
  referenceId: uuid("referenceId").references(() => users.id, {
    onDelete: "set null",
  }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  status: varchar("status", { length: 255 }).notNull(),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd"),
  seats: integer("seats"),
  trialStart: timestamp("trialStart"),
  trialEnd: timestamp("trialEnd"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}).enableRLS();

export const subscriptionsRelations = relations(subscription, ({ one }) => ({
  user: one(users, {
    fields: [subscription.referenceId],
    references: [users.id],
  }),
}));
