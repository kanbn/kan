import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { workspaces } from "./workspaces";

export const webhookEvents = [
  "card.created",
  "card.updated",
  "card.moved",
  "card.deleted",
] as const;
export type WebhookEvent = (typeof webhookEvents)[number];

export const workspaceWebhooks = pgTable("workspace_webhooks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  workspaceId: bigint("workspaceId", { mode: "number" })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 2048 }).notNull(),
  secret: text("secret"),
  events: text("events").notNull(), // JSON array of webhook events
  active: boolean("active").notNull().default(true),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
}).enableRLS();

export const workspaceWebhooksRelations = relations(
  workspaceWebhooks,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceWebhooks.workspaceId],
      references: [workspaces.id],
      relationName: "workspaceWebhooksWorkspace",
    }),
    createdByUser: one(users, {
      fields: [workspaceWebhooks.createdBy],
      references: [users.id],
      relationName: "workspaceWebhooksCreatedByUser",
    }),
  }),
);
