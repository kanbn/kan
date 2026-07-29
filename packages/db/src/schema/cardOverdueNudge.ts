import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  date,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { cards } from "./cards";
import { users } from "./users";

/**
 * Per-(card, user) daily dedup for the overdue nudge. One row per card per
 * member per their-local calendar day, so the Mattermost poller never sends the
 * same member more than one overdue DM in a day. The unique index enforces it.
 */
export const cardOverdueNudge = pgTable(
  "card_overdue_nudge",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    cardId: bigint("cardId", { mode: "number" })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: uuid("userId").references(() => users.id, { onDelete: "set null" }),
    nudgeDate: date("nudgeDate").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("card_overdue_nudge_card_user_date_idx").on(
      table.cardId,
      table.userId,
      table.nudgeDate,
    ),
    index("card_overdue_nudge_card_idx").on(table.cardId),
  ],
).enableRLS();

export const cardOverdueNudgeRelations = relations(
  cardOverdueNudge,
  ({ one }) => ({
    card: one(cards, {
      fields: [cardOverdueNudge.cardId],
      references: [cards.id],
      relationName: "cardOverdueNudgeCard",
    }),
    user: one(users, {
      fields: [cardOverdueNudge.userId],
      references: [users.id],
      relationName: "cardOverdueNudgeUser",
    }),
  }),
);
