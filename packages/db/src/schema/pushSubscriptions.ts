import { relations } from "drizzle-orm";
import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Stores browser push subscription endpoints for web notifications.
 * Completely independent of the billing `subscription` table — keyed on
 * `users.id`, only holds the encrypted push info needed by `web-push`.
 * One user may have many rows (one per device/browser); the `endpoint`
 * uniquely identifies a subscription.
 */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    subscriptionJson: text("subscriptionJson").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("push_subscription_endpoint_idx").on(table.endpoint),
    index("push_subscription_user_idx").on(table.userId),
  ],
).enableRLS();

export const pushSubscriptionRelations = relations(
  pushSubscription,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscription.userId],
      references: [users.id],
      relationName: "pushSubscriptionsUser",
    }),
  }),
);
