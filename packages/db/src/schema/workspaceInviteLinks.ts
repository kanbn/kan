import {
  bigint,
  bigserial,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces";

export const inviteLinkStatuses = ["active", "inactive"] as const;
export type InviteLinkStatus = (typeof inviteLinkStatuses)[number];
export const inviteLinkStatusEnum = pgEnum(
  "invite_link_status",
  inviteLinkStatuses,
);

export const workspaceInviteLinks = pgTable("workspace_invite_links", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  workspaceId: bigint("workspaceId", { mode: "number" })
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 12 }).notNull().unique(),
  status: inviteLinkStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}).enableRLS();
