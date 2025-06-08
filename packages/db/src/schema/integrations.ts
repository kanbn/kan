import { relations } from "drizzle-orm";
import {
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const integrations = pgTable(
  "integration",
  {
    provider: varchar("provider", { length: 255 }).notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: varchar("accessToken", { length: 255 }).notNull(),
    refreshToken: varchar("refreshToken", { length: 255 }),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updatedAt").$onUpdateFn(() => new Date()),
  },
  (table) => [
    primaryKey({
      name: "integration_pkey",
      columns: [table.userId, table.provider],
    }),
  ],
).enableRLS();

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));
