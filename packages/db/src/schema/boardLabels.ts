import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const boardLabels = pgTable(
  "board_label",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    colourCode: varchar("colourCode", { length: 12 }),
    workspaceId: bigint("workspaceId", { mode: "number" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
    deletedAt: timestamp("deletedAt"),
    deletedBy: uuid("deletedBy").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [index("board_label_workspace_idx").on(table.workspaceId)],
).enableRLS();

export const boardsToBoardLabels = pgTable(
  "_board_board_labels",
  {
    boardId: bigint("boardId", { mode: "number" })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    boardLabelId: bigint("boardLabelId", { mode: "number" })
      .notNull()
      .references(() => boardLabels.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.boardLabelId] }),
    index("board_board_labels_label_idx").on(table.boardLabelId),
  ],
).enableRLS();

export const boardsToBoardLabelsRelations = relations(
  boardsToBoardLabels,
  ({ one }) => ({
    board: one(boards, {
      fields: [boardsToBoardLabels.boardId],
      references: [boards.id],
    }),
    boardLabel: one(boardLabels, {
      fields: [boardsToBoardLabels.boardLabelId],
      references: [boardLabels.id],
    }),
  }),
);
