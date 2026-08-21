import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const cardUnblockAck = pgTable(
  "card_unblock_ack",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    mattermostUserId: varchar("mattermostUserId", { length: 64 }).notNull(),
    messageText: text("messageText").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastRemindedAt: timestamp("lastRemindedAt"),
    confirmedAt: timestamp("confirmedAt"),
  },
  (table) => [
    index("card_unblock_ack_due_idx").on(
      table.confirmedAt,
      table.lastRemindedAt,
      table.createdAt,
    ),
  ],
).enableRLS();
