import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { apikey } from "./auth";
import { boards, userBoardFavorites } from "./boards";
import { cards } from "./cards";
import { imports } from "./imports";
import { integrations } from "./integrations";
import { lists } from "./lists";
import {
  userDailyQuest,
  userEnergyCheckin,
  userSideQuest,
  userWin,
} from "./productivity";
import { workspaceMembers, workspaces } from "./workspaces";

export const userTypeStatuses = ["human", "bot"] as const;
export type UserType = (typeof userTypeStatuses)[number];
export const userTypeEnum = pgEnum("user_type", userTypeStatuses);

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
  type: userTypeEnum("type").notNull().default("human"),
  calendarToken: varchar("calendarToken", { length: 64 }).unique(),
}).enableRLS();

export const usersRelations = relations(users, ({ many }) => ({
  deletedBoards: many(boards, {
    relationName: "boardDeletedByUser",
  }),
  boards: many(boards, {
    relationName: "boardCreatedByUser",
  }),
  deletedCards: many(cards, {
    relationName: "cardsDeletedByUser",
  }),
  cards: many(cards, {
    relationName: "cardsCreatedByUser",
  }),
  imports: many(imports),
  deletedLists: many(lists, {
    relationName: "listsDeletedByUser",
  }),
  lists: many(lists, {
    relationName: "listsCreatedByUser",
  }),
  deletedWorkspaces: many(workspaces, {
    relationName: "workspaceDeletedByUser",
  }),
  workspaces: many(workspaces, {
    relationName: "workspaceCreatedByUser",
  }),
  apiKeys: many(apikey),
  integrations: many(integrations),
  energyCheckins: many(userEnergyCheckin, {
    relationName: "energyCheckinUser",
  }),
  dailyQuests: many(userDailyQuest, {
    relationName: "dailyQuestUser",
  }),
  wins: many(userWin, {
    relationName: "winUser",
  }),
  sideQuests: many(userSideQuest, {
    relationName: "sideQuestUser",
  }),
}));

export const usersToWorkspacesRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    addedBy: one(users, {
      fields: [workspaceMembers.createdBy],
      references: [users.id],
      relationName: "usersToWorkspacesAddedByUser",
    }),
    deletedBy: one(users, {
      fields: [workspaceMembers.deletedBy],
      references: [users.id],
      relationName: "usersToWorkspacesDeletedByUser",
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
      relationName: "usersToWorkspacesUser",
    }),
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
      relationName: "usersToWorkspacesWorkspace",
    }),
  }),
);

export const userBoardFavoritesRelations = relations(
  userBoardFavorites,
  ({ one }) => ({
    user: one(users, {
      fields: [userBoardFavorites.userId],
      references: [users.id],
    }),
    board: one(boards, {
      fields: [userBoardFavorites.boardId],
      references: [boards.id],
    }),
  }),
);
