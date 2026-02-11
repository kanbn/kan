import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { cards } from "./cards";
import { comments } from "./cards";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const notificationTypes = [
  "mention",
  "workspace.member.added",
  "workspace.member.removed",
  "workspace.role.changed",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export const notificationTypeEnum = pgEnum("notification_type", notificationTypes);

export const notifications = pgTable(
  "notification",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    type: notificationTypeEnum("type").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: bigint("cardId", { mode: "number" }).references(() => cards.id, {
      onDelete: "cascade",
    }),
    commentId: bigint("commentId", { mode: "number" }).references(
      () => comments.id,
      { onDelete: "cascade" },
    ),
    workspaceId: bigint("workspaceId", { mode: "number" }).references(
      () => workspaces.id,
      { onDelete: "cascade" },
    ),
    metadata: text("metadata"),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => [
    index("notification_user_deleted_idx").on(table.userId, table.deletedAt),
    index("notification_user_read_deleted_idx").on(
      table.userId,
      table.readAt,
      table.deletedAt,
    ),
    index("notification_user_type_card_idx").on(
      table.userId,
      table.type,
      table.cardId,
    ),
    index("notification_user_type_workspace_idx").on(
      table.userId,
      table.type,
      table.workspaceId,
    ),
    index("notification_user_created_idx").on(table.userId, table.createdAt),
  ],
).enableRLS();

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "notificationsUser",
  }),
  card: one(cards, {
    fields: [notifications.cardId],
    references: [cards.id],
    relationName: "notificationsCard",
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
    relationName: "notificationsComment",
  }),
  workspace: one(workspaces, {
    fields: [notifications.workspaceId],
    references: [workspaces.id],
    relationName: "notificationsWorkspace",
  }),
}));

