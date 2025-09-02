import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { subscription } from "./subscriptions";
import { users } from "./users";

export const memberRoles = ["admin", "member", "guest"] as const;
export type MemberRole = (typeof memberRoles)[number];
export const memberRoleEnum = pgEnum("role", memberRoles);

export const memberStatuses = ["invited", "active", "removed"] as const;
export type MemberStatus = (typeof memberStatuses)[number];
export const memberStatusEnum = pgEnum("member_status", memberStatuses);

export const slugTypes = ["reserved", "premium"] as const;
export type SlugType = (typeof slugTypes)[number];
export const slugTypeEnum = pgEnum("slug_type", slugTypes);

export const workspacePlans = ["free", "pro", "enterprise"] as const;
export type WorkspacePlan = (typeof workspacePlans)[number];
export const workspacePlanEnum = pgEnum("workspace_plan", workspacePlans);

export const workspaces = pgTable("workspace", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  plan: workspacePlanEnum("plan").notNull().default("free"),
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

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  user: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
    relationName: "workspaceCreatedByUser",
  }),
  deletedBy: one(users, {
    fields: [workspaces.deletedBy],
    references: [users.id],
    relationName: "workspaceDeletedByUser",
  }),
  members: many(workspaceMembers),
  boards: many(boards),
  subscriptions: many(subscription),
}));

export const workspaceMembers = pgTable("workspace_members", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  userId: uuid("userId").references(() => users.id, { onDelete: "set null" }),
  workspaceId: bigint("workspaceId", { mode: "number" })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  createdBy: uuid("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id, {
    onDelete: "set null",
  }),
  role: memberRoleEnum("role").notNull(),
  status: memberStatusEnum("status").default("invited").notNull(),
}).enableRLS();

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
      relationName: "workspaceMembersUser",
    }),
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
      relationName: "workspaceMembersWorkspace",
    }),
  }),
);

export const slugs = pgTable("workspace_slugs", {
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: slugTypeEnum("type").notNull(),
});
