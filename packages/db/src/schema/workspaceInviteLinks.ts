import {
  bigint,
  bigserial,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { workspaces } from "./workspaces";

export const inviteLinkStatuses = ["active", "inactive"] as const;
export type InviteLinkStatus = (typeof inviteLinkStatuses)[number];
export const inviteLinkStatusEnum = pgEnum(
  "invite_link_status",
  inviteLinkStatuses,
);

export const workspaceInviteLinks = pgTable("workspace_invite_links", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  workspaceId: bigint("workspaceId", { mode: "number" })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 12 }).notNull().unique(),
  status: inviteLinkStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: uuid("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updatedAt"),
  updatedBy: uuid("updatedBy").references(() => users.id, {
    onDelete: "set null",
  }),
}).enableRLS();
