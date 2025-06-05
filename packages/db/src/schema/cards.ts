import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { imports } from "./imports";
import { labels } from "./labels";
import { lists } from "./lists";
import { users } from "./users";
import { workspaceMembers } from "./workspaces";

export const activityTypes = [
  "card.created",
  "card.updated.title",
  "card.updated.description",
  "card.updated.index",
  "card.updated.list",
  "card.updated.label.added",
  "card.updated.label.removed",
  "card.updated.member.added",
  "card.updated.member.removed",
  "card.updated.comment.added",
  "card.updated.comment.updated",
  "card.updated.comment.deleted",
  "card.archived",
] as const;

export type ActivityType = (typeof activityTypes)[number];

export const activityTypeEnum = pgEnum("card_activity_type", activityTypes);

export const cards = pgTable("card", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  index: integer("index").notNull(),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id),
  listId: bigint("listId", { mode: "number" })
    .notNull()
    .references(() => lists.id, { onDelete: "cascade" }),
  importId: bigint("importId", { mode: "number" }).references(() => imports.id),
}).enableRLS();

export const cardsRelations = relations(cards, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [cards.createdBy],
    references: [users.id],
  }),
  list: one(lists, {
    fields: [cards.listId],
    references: [lists.id],
  }),
  deletedBy: one(users, {
    fields: [cards.deletedBy],
    references: [users.id],
  }),
  labels: many(cardsToLabels),
  members: many(cardToWorkspaceMembers),
  import: one(imports, {
    fields: [cards.importId],
    references: [imports.id],
  }),
  comments: many(comments),
  activities: many(cardActivities),
}));

export const cardActivities = pgTable("card_activity", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  type: activityTypeEnum("type").notNull(),
  cardId: bigint("cardId", { mode: "number" })
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  fromIndex: integer("fromIndex"),
  toIndex: integer("toIndex"),
  fromListId: bigint("fromListId", { mode: "number" }).references(
    () => lists.id, { onDelete: "cascade" },
  ),
  toListId: bigint("toListId", { mode: "number" }).references(() => lists.id, { onDelete: "cascade" }),
  labelId: bigint("labelId", { mode: "number" }).references(() => labels.id, { onDelete: "cascade" }),
  workspaceMemberId: bigint("workspaceMemberId", {
    mode: "number",
  }).references(() => workspaceMembers.id, { onDelete: "cascade" }),
  fromTitle: varchar("fromTitle", { length: 255 }),
  toTitle: varchar("toTitle", { length: 255 }),
  fromDescription: text("fromDescription"),
  toDescription: text("toDescription"),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  commentId: bigint("commentId", { mode: "number" }).references(
    () => comments.id, { onDelete: "cascade" },
  ),
  fromComment: text("fromComment"),
  toComment: text("toComment"),
}).enableRLS();

export const cardActivitiesRelations = relations(cardActivities, ({ one }) => ({
  card: one(cards, {
    fields: [cardActivities.cardId],
    references: [cards.id],
  }),
  fromList: one(lists, {
    fields: [cardActivities.fromListId],
    references: [lists.id],
  }),
  toList: one(lists, {
    fields: [cardActivities.toListId],
    references: [lists.id],
  }),
  label: one(labels, {
    fields: [cardActivities.labelId],
    references: [labels.id],
  }),
  workspaceMember: one(workspaceMembers, {
    fields: [cardActivities.workspaceMemberId],
    references: [workspaceMembers.id],
  }),
  user: one(users, {
    fields: [cardActivities.createdBy],
    references: [users.id],
  }),
  member: one(workspaceMembers, {
    fields: [cardActivities.workspaceMemberId],
    references: [workspaceMembers.id],
  }),
  comment: one(comments, {
    fields: [cardActivities.commentId],
    references: [comments.id],
  }),
}));

export const cardsToLabels = pgTable(
  "_card_labels",
  {
    cardId: bigint("cardId", { mode: "number" })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    labelId: bigint("labelId", { mode: "number" })
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.labelId] })],
).enableRLS();

export const cardToLabelsRelations = relations(cardsToLabels, ({ one }) => ({
  card: one(cards, {
    fields: [cardsToLabels.cardId],
    references: [cards.id],
  }),
  label: one(labels, {
    fields: [cardsToLabels.labelId],
    references: [labels.id],
  }),
}));

export const cardToWorkspaceMembers = pgTable(
  "_card_workspace_members",
  {
    cardId: bigint("cardId", { mode: "number" })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    workspaceMemberId: bigint("workspaceMemberId", { mode: "number" })
      .notNull()
      .references(() => workspaceMembers.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.workspaceMemberId] })],
).enableRLS();

export const cardToWorkspaceMembersRelations = relations(
  cardToWorkspaceMembers,
  ({ one }) => ({
    card: one(cards, {
      fields: [cardToWorkspaceMembers.cardId],
      references: [cards.id],
    }),
    member: one(workspaceMembers, {
      fields: [cardToWorkspaceMembers.workspaceMemberId],
      references: [workspaceMembers.id],
    }),
  }),
);

export const comments = pgTable("card_comments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  comment: text("comment").notNull(),
  cardId: bigint("cardId", { mode: "number" })
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
  deletedBy: uuid("deletedBy").references(() => users.id, { onDelete: "cascade" }),
}).enableRLS();

export const commentsRelations = relations(comments, ({ one }) => ({
  card: one(cards, {
    fields: [comments.cardId],
    references: [cards.id],
  }),
  createdBy: one(users, {
    fields: [comments.createdBy],
    references: [users.id],
  }),
  deletedBy: one(users, {
    fields: [comments.deletedBy],
    references: [users.id],
  }),
}));
