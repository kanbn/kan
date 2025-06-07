import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { apikey } from "./auth";
import { boards } from "./boards";
import { cards } from "./cards";
import { imports } from "./imports";
import { lists } from "./lists";
import { workspaceMembers, workspaces } from "./workspaces";

export const users = pgTable("user", {
  id: uuid("id")
    .notNull()
    .primaryKey()
    .default(sql`uuid_generate_v4()`),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  trelloToken: varchar("trelloToken", { length: 255 }),
  trelloConnected: boolean("trelloConnected").notNull().default(false),
}).enableRLS();

export const usersRelations = relations(users, ({ many }) => ({
  boards: many(boards),
  cards: many(cards),
  imports: many(imports),
  lists: many(lists),
  workspaces: many(workspaces),
  apiKeys: many(apikey),
}));

export const usersToWorkspacesRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    addedBy: one(users, {
      fields: [workspaceMembers.createdBy],
      references: [users.id],
    }),
    deletedBy: one(users, {
      fields: [workspaceMembers.deletedBy],
      references: [users.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  }),
);
