import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { cards } from "./cards";
import { users } from "./users";

export const cardNotificationChannels = [
  "mattermost",
  "google_calendar",
] as const;

export type CardNotificationChannel =
  (typeof cardNotificationChannels)[number];

export const cardNotificationChannelEnum = pgEnum(
  "card_notification_channel",
  cardNotificationChannels,
);

export const cardNotificationTriggers = ["relative", "absolute"] as const;

export type CardNotificationTrigger =
  (typeof cardNotificationTriggers)[number];

export const cardNotificationTriggerEnum = pgEnum(
  "card_notification_trigger",
  cardNotificationTriggers,
);

export const cardNotificationOffsetUnits = [
  "minutes",
  "hours",
  "days",
] as const;

export type CardNotificationOffsetUnit =
  (typeof cardNotificationOffsetUnits)[number];

export const cardNotificationOffsetUnitEnum = pgEnum(
  "card_notification_offset_unit",
  cardNotificationOffsetUnits,
);

export const cardNotifications = pgTable(
  "card_notification",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    cardId: bigint("cardId", { mode: "number" })
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    channel: cardNotificationChannelEnum("channel").notNull(),
    triggerType: cardNotificationTriggerEnum("triggerType").notNull(),
    offsetValue: integer("offsetValue"),
    offsetUnit: cardNotificationOffsetUnitEnum("offsetUnit"),
    triggerAt: timestamp("triggerAt"),
    timeOfDay: varchar("timeOfDay", { length: 5 }).notNull().default("09:00"),
    timezone: varchar("timezone", { length: 64 }),
    deliveredAt: timestamp("deliveredAt"),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt"),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => [
    index("card_notification_channel_delivered_idx").on(
      table.channel,
      table.deliveredAt,
      table.deletedAt,
    ),
    index("card_notification_card_deleted_idx").on(
      table.cardId,
      table.deletedAt,
    ),
  ],
).enableRLS();

export const cardNotificationsRelations = relations(
  cardNotifications,
  ({ one }) => ({
    card: one(cards, {
      fields: [cardNotifications.cardId],
      references: [cards.id],
      relationName: "cardNotificationsCard",
    }),
    createdBy: one(users, {
      fields: [cardNotifications.createdBy],
      references: [users.id],
      relationName: "cardNotificationsCreatedByUser",
    }),
  }),
);
