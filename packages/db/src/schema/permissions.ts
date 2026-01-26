import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces";

export const workspaceRoles = pgTable(
  "workspace_roles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    workspaceId: bigint("workspaceId", { mode: "number" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    description: varchar("description", { length: 255 }),
    hierarchyLevel: integer("hierarchyLevel").notNull(),
    isSystem: boolean("isSystem").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [
    uniqueIndex("unique_role_per_workspace").on(table.workspaceId, table.name),
    index("workspace_roles_workspace_idx").on(table.workspaceId),
  ],
).enableRLS();

export const workspaceRolesRelations = relations(
  workspaceRoles,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [workspaceRoles.workspaceId],
      references: [workspaces.id],
      relationName: "workspaceRoles",
    }),
    permissions: many(workspaceRolePermissions),
  }),
);


export const workspaceRolePermissions = pgTable(
  "workspace_role_permissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workspaceRoleId: bigint("workspaceRoleId", { mode: "number" })
      .notNull()
      .references(() => workspaceRoles.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 64 }).notNull(),
    granted: boolean("granted").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_role_permission").on(
      table.workspaceRoleId,
      table.permission,
    ),
    index("role_permissions_role_idx").on(table.workspaceRoleId),
  ],
).enableRLS();

export const workspaceRolePermissionsRelations = relations(
  workspaceRolePermissions,
  ({ one }) => ({
    role: one(workspaceRoles, {
      fields: [workspaceRolePermissions.workspaceRoleId],
      references: [workspaceRoles.id],
      relationName: "rolePermissions",
    }),
  }),
);

export const workspaceMemberPermissions = pgTable(
  "workspace_member_permissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    workspaceMemberId: bigint("workspaceMemberId", { mode: "number" }).notNull(),
    permission: varchar("permission", { length: 64 }).notNull(),
    granted: boolean("granted").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
  },
  (table) => [
    uniqueIndex("unique_member_permission").on(
      table.workspaceMemberId,
      table.permission,
    ),
    index("permission_member_idx").on(table.workspaceMemberId),
  ],
).enableRLS();
