import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";

import type { dbClient } from "@banana/db/client";
import {
  cardOverdueNudge,
  cardNotifications,
  cards,
  cardToWorkspaceMembers,
  users,
  workspaceMembers,
  type CardNotificationChannel,
  type CardNotificationOffsetUnit,
  type CardNotificationTrigger,
} from "@banana/db/schema";
import { generateUID } from "@banana/shared/utils";

/** Millisecond factor for a given offset unit. */
function unitToMs(unit: CardNotificationOffsetUnit): number {
  switch (unit) {
    case "minutes":
      return 60 * 1000;
    case "hours":
      return 60 * 60 * 1000;
    case "days":
      return 24 * 60 * 60 * 1000;
  }
}

/** Parse a "HH:mm" string into [hours, minutes]. Returns [0,0] on bad input. */
function parseTimeOfDay(timeOfDay: string | null | undefined): [number, number] {
  if (!timeOfDay) return [0, 0];
  const parts = timeOfDay.split(":").map((n) => parseInt(n, 10));
  const h = parts[0];
  const m = parts[1];
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    return [0, 0];
  }
  return [h, m];
}

function safeTimezone(tz: string | null | undefined): string {
  return tz && tz.length > 0 ? tz : "UTC";
}

/**
 * Return the UTC instant for the calendar day of `date` (as seen in `tz`) at
 * "HH:mm" (also in `tz`). Uses date-fns-tz so a 9am reminder set in US fires at
 * 9am US, not server time. Null tz degrades to UTC.
 */
export function applyTimeOfDay(
  date: Date,
  timeOfDay: string | null | undefined,
  tz: string | null | undefined,
): Date {
  const zone = safeTimezone(tz);
  const zoned = toZonedTime(date, zone);
  const [h, m] = parseTimeOfDay(timeOfDay);
  const wall = new Date(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate(),
    h,
    m,
    0,
    0,
  );
  return fromZonedTime(wall, zone);
}

/**
 * Compute the fire time for a *relative* reminder. The due date carries no
 * time (date-only), so the reminder is treated as due at `timeOfDay` (default
 * 09:00) on the due date in `tz`, then the offset is subtracted. Returns
 * undefined if inputs are missing.
 */
export function computeRelativeFireAt(
  dueDate: Date | null | undefined,
  offsetValue: number | null | undefined,
  offsetUnit: CardNotificationOffsetUnit | null | undefined,
  timeOfDay: string | null | undefined,
  tz: string | null | undefined,
): Date | undefined {
  if (!dueDate || offsetValue == null || !offsetUnit) return undefined;
  const dueAt = applyTimeOfDay(dueDate, timeOfDay, tz);
  return new Date(dueAt.getTime() - offsetValue * unitToMs(offsetUnit));
}

/** Compute the fire time for an *absolute* reminder: trigger day @ timeOfDay in tz. */
export function computeAbsoluteFireAt(
  triggerAt: Date | null | undefined,
  timeOfDay: string | null | undefined,
  tz: string | null | undefined,
): Date | undefined {
  if (!triggerAt) return undefined;
  return applyTimeOfDay(triggerAt, timeOfDay, tz);
}

/** The "yyyy-MM-dd" calendar date that `date` falls on as seen in `tz`. */
export function localDateKey(
  date: Date,
  tz: string | null | undefined,
): string {
  return format(toZonedTime(date, safeTimezone(tz)), "yyyy-MM-dd");
}

export interface CardNotificationInput {
  cardId: number;
  channel: CardNotificationChannel;
  triggerType: CardNotificationTrigger;
  offsetValue?: number | null;
  offsetUnit?: CardNotificationOffsetUnit | null;
  triggerAt?: Date | null;
  timeOfDay?: string | null;
  timezone?: string | null;
  createdBy?: string | null;
}

export const create = async (db: dbClient, input: CardNotificationInput) => {
  const rows = await db
    .insert(cardNotifications)
    .values({
      publicId: generateUID(),
      cardId: input.cardId,
      channel: input.channel,
      triggerType: input.triggerType,
      offsetValue: input.offsetValue ?? null,
      offsetUnit: input.offsetUnit ?? null,
      triggerAt: input.triggerAt ?? null,
      timeOfDay: input.timeOfDay ?? "09:00",
      timezone: input.timezone ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  const result = rows[0];
  if (!result) {
    throw new Error("Failed to create card notification");
  }
  return result;
};

export const listByCardPublicId = async (
  db: dbClient,
  cardPublicId: string,
) => {
  return db
    .select({
      id: cardNotifications.id,
      publicId: cardNotifications.publicId,
      channel: cardNotifications.channel,
      triggerType: cardNotifications.triggerType,
      offsetValue: cardNotifications.offsetValue,
      offsetUnit: cardNotifications.offsetUnit,
      triggerAt: cardNotifications.triggerAt,
      timeOfDay: cardNotifications.timeOfDay,
      timezone: cardNotifications.timezone,
      deliveredAt: cardNotifications.deliveredAt,
      createdAt: cardNotifications.createdAt,
    })
    .from(cardNotifications)
    .innerJoin(cards, eq(cardNotifications.cardId, cards.id))
    .where(
      and(
        eq(cards.publicId, cardPublicId),
        isNull(cardNotifications.deletedAt),
      ),
    )
    .orderBy(desc(cardNotifications.createdAt));
};

export const getByPublicIdAndCardPublicId = async (
  db: dbClient,
  args: { notificationPublicId: string; cardPublicId: string },
) => {
  const result = await db.query.cardNotifications.findFirst({
    where: and(
      eq(cardNotifications.publicId, args.notificationPublicId),
      isNull(cardNotifications.deletedAt),
    ),
    with: {
      card: {
        columns: {
          id: true,
          publicId: true,
          dueDate: true,
          title: true,
        },
      },
    },
  });

  if (!result || result.card.publicId !== args.cardPublicId) return null;
  return result;
};

export const updateByPublicId = async (
  db: dbClient,
  notificationPublicId: string,
  patch: {
    channel?: CardNotificationChannel;
    triggerType?: CardNotificationTrigger;
    offsetValue?: number | null;
    offsetUnit?: CardNotificationOffsetUnit | null;
    triggerAt?: Date | null;
    timeOfDay?: string;
    timezone?: string | null;
  },
) => {
  const rows = await db
    .update(cardNotifications)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(cardNotifications.publicId, notificationPublicId))
    .returning();

  return rows[0] ?? null;
};

export const softDelete = async (
  db: dbClient,
  notificationPublicId: string,
) => {
  const [result] = await db
    .update(cardNotifications)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(cardNotifications.publicId, notificationPublicId))
    .returning();

  return result;
};

export const markDelivered = async (
  db: dbClient,
  notificationPublicId: string,
) => {
  await db
    .update(cardNotifications)
    .set({ deliveredAt: new Date(), updatedAt: new Date() })
    .where(eq(cardNotifications.publicId, notificationPublicId));
};

export interface DueReminder {
  notificationPublicId: string;
  cardId: number;
  cardPublicId: string;
  title: string;
  dueDate: Date | null;
  fireAt: Date;
}

/**
 * Return every due Mattermost reminder whose computed fireAt <= `now`. Only
 * mattermost-channel (DMs need a poller), undelivered, non-deleted, on a card
 * that is NOT done and not deleted. Relative reminders are skipped when the card
 * has no due date. Google Calendar reminders are not polled — they are written
 * as events and Google fires its own alert.
 */
export const getDueMattermostReminders = async (
  db: dbClient,
  now: Date,
): Promise<DueReminder[]> => {
  const rows = await db
    .select({
      notificationPublicId: cardNotifications.publicId,
      triggerType: cardNotifications.triggerType,
      offsetValue: cardNotifications.offsetValue,
      offsetUnit: cardNotifications.offsetUnit,
      triggerAt: cardNotifications.triggerAt,
      timeOfDay: cardNotifications.timeOfDay,
      timezone: cardNotifications.timezone,
      cardId: cards.id,
      cardPublicId: cards.publicId,
      title: cards.title,
      dueDate: cards.dueDate,
    })
    .from(cardNotifications)
    .innerJoin(cards, eq(cardNotifications.cardId, cards.id))
    .where(
      and(
        eq(cardNotifications.channel, "mattermost"),
        isNull(cardNotifications.deliveredAt),
        isNull(cardNotifications.deletedAt),
        eq(cards.isDone, false),
        isNull(cards.deletedAt),
      ),
    );

  const due: DueReminder[] = [];
  for (const row of rows) {
    const fireAt =
      row.triggerType === "relative"
        ? computeRelativeFireAt(
            row.dueDate,
            row.offsetValue,
            row.offsetUnit,
            row.timeOfDay,
            row.timezone,
          )
        : computeAbsoluteFireAt(row.triggerAt, row.timeOfDay, row.timezone);

    if (fireAt && fireAt.getTime() <= now.getTime()) {
      due.push({
        notificationPublicId: row.notificationPublicId,
        cardId: row.cardId,
        cardPublicId: row.cardPublicId,
        title: row.title,
        dueDate: row.dueDate,
        fireAt,
      });
    }
  }

  return due;
};

export interface OverdueCardMember {
  cardId: number;
  cardPublicId: string;
  title: string;
  dueDate: Date;
  userId: string;
  memberTimezone: string | null;
  email: string;
}

/**
 * Return every (card, member) for cards past their due date but NOT done (and
 * not deleted), with each member's userId + timezone + email. Used by the
 * overdue nudge: each member is nudged at 9am in their own tz.
 */
export const getOverdueCardsWithMembers = async (
  db: dbClient,
  now: Date,
): Promise<OverdueCardMember[]> => {
  const rows = await db
    .select({
      cardId: cards.id,
      cardPublicId: cards.publicId,
      title: cards.title,
      dueDate: cards.dueDate,
      userId: workspaceMembers.userId,
      memberTimezone: users.timezone,
      email: workspaceMembers.email,
    })
    .from(cards)
    .innerJoin(
      cardToWorkspaceMembers,
      eq(cardToWorkspaceMembers.cardId, cards.id),
    )
    .innerJoin(
      workspaceMembers,
      eq(cardToWorkspaceMembers.workspaceMemberId, workspaceMembers.id),
    )
    .leftJoin(users, eq(workspaceMembers.userId, users.id))
    .where(
      and(
        lt(cards.dueDate, now),
        eq(cards.isDone, false),
        isNull(cards.deletedAt),
        isNull(workspaceMembers.deletedAt),
        isNotNull(workspaceMembers.userId),
      ),
    );

  return rows
    .filter((r): r is OverdueCardMember & { userId: string } => !!r.userId)
    .map((r) => ({
      cardId: r.cardId,
      cardPublicId: r.cardPublicId,
      title: r.title,
      dueDate: r.dueDate ?? now,
      userId: r.userId,
      memberTimezone: r.memberTimezone,
      email: r.email,
    }));
};

/** Has this user already been nudged for this card on the given local date? */
export const hasNudgedToday = async (
  db: dbClient,
  args: { cardId: number; userId: string; nudgeDate: string },
): Promise<boolean> => {
  const found = await db
    .select({ id: cardOverdueNudge.id })
    .from(cardOverdueNudge)
    .where(
      and(
        eq(cardOverdueNudge.cardId, args.cardId),
        eq(cardOverdueNudge.userId, args.userId),
        eq(cardOverdueNudge.nudgeDate, args.nudgeDate),
      ),
    )
    .limit(1);
  return found.length > 0;
};

/** Record a nudge; the unique index makes it idempotent (ON CONFLICT DO NOTHING). */
export const recordNudge = async (
  db: dbClient,
  args: { cardId: number; userId: string; nudgeDate: string },
): Promise<void> => {
  await db
    .insert(cardOverdueNudge)
    .values(args)
    .onConflictDoNothing({
      target: [
        cardOverdueNudge.cardId,
        cardOverdueNudge.userId,
        cardOverdueNudge.nudgeDate,
      ],
    });
};
