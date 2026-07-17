import { relations, sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { boards } from "./boards";
import { cards } from "./cards";
import { imports } from "./imports";
import { users } from "./users";

export const lists = pgTable(
  "list",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    index: integer("index").notNull(),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
    deletedAt: timestamp("deletedAt"),
    deletedBy: uuid("deletedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    boardId: bigint("boardId", { mode: "number" })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    importId: bigint("importId", { mode: "number" }).references(
      () => imports.id,
    ),
    isDoneList: boolean("isDoneList").notNull().default(false),
  },
  (table) => [
    uniqueIndex("unique_done_list_per_board")
      .on(table.boardId)
      .where(sql`${table.isDoneList} = true AND ${table.deletedAt} IS NULL`),
  ],
).enableRLS();

export const listsRelations = relations(lists, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [lists.createdBy],
    references: [users.id],
    relationName: "listsCreatedByUser",
  }),
  board: one(boards, {
    fields: [lists.boardId],
    references: [boards.id],
    relationName: "listsBoard",
  }),
  cards: many(cards),
  deletedBy: one(users, {
    fields: [lists.deletedBy],
    references: [users.id],
    relationName: "listsDeletedByUser",
  }),
  import: one(imports, {
    fields: [lists.importId],
    references: [imports.id],
    relationName: "listsImport",
  }),
}));
