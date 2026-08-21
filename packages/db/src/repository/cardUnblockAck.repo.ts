import { and, eq, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@banana/db/client";
import { cardUnblockAck } from "@banana/db/schema";
import { generateUID } from "@banana/shared/utils";

/** Stop re-reminding an unacknowledged unblock after this many days. */
export const REMINDER_CAP_DAYS = 7;

// Timezone handling:
// - A `timestamp without time zone` column written via `new Date()` on the HKT
//   server stores the HKT wall-clock, but pg reads it back on the UTC frame.
// - `now() AT TIME ZONE 'Asia/Hong_Kong'` returns the HKT frame directly.
// - `toHktMs()` shifts the UTC-frame column value onto the HKT frame so both
//   operands of the hourly gate compare on the same clock.
const HKT_OFFSET_HOURS = 8;
const toHktMs = (d: Date) => d.getTime() + HKT_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Create a pending unblock ack. Any existing UNCONFIRMED ack for the same
 * recipient + message is removed first, so repeated identical unblock events
 * (e.g. toggling a blocker done → undone → done) collapse into a single
 * pending reminder chain instead of stacking parallel ones.
 */
export const create = async (
  db: dbClient,
  input: { mattermostUserId: string; messageText: string },
) => {
  await db
    .delete(cardUnblockAck)
    .where(
      and(
        eq(cardUnblockAck.mattermostUserId, input.mattermostUserId),
        eq(cardUnblockAck.messageText, input.messageText),
        isNull(cardUnblockAck.confirmedAt),
      ),
    );

  const rows = await db
    .insert(cardUnblockAck)
    .values({
      publicId: generateUID(),
      mattermostUserId: input.mattermostUserId,
      messageText: input.messageText,
      // Seed lastRemindedAt = now (HKT wall-clock) so the poller does NOT re-fire
      // the same reminder as an extra immediate one: the DM was already sent
      // right now by the trigger. Without this, lastRemindedAt is NULL and the
      // poller treats "never reminded" as due on the very next tick → duplicate.
      lastRemindedAt: new Date(),
    })
    .returning({ publicId: cardUnblockAck.publicId });

  const result = rows[0];
  if (!result) {
    throw new Error("Failed to create card unblock ack");
  }
  return result;
};

/** Look up a pending ack by its button token, scoped to the clicking MM user. */
export const getByPublicIdAndMmUser = async (
  db: dbClient,
  publicId: string,
  mattermostUserId: string,
) => {
  const rows = await db
    .select({
      publicId: cardUnblockAck.publicId,
      messageText: cardUnblockAck.messageText,
      confirmedAt: cardUnblockAck.confirmedAt,
    })
    .from(cardUnblockAck)
    .where(
      and(
        eq(cardUnblockAck.publicId, publicId),
        eq(cardUnblockAck.mattermostUserId, mattermostUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

/** Look up an ack by its token alone (magic-link confirm flow). */
export const getByPublicId = async (db: dbClient, publicId: string) => {
  const rows = await db
    .select({
      publicId: cardUnblockAck.publicId,
      messageText: cardUnblockAck.messageText,
      confirmedAt: cardUnblockAck.confirmedAt,
    })
    .from(cardUnblockAck)
    .where(eq(cardUnblockAck.publicId, publicId))
    .limit(1);
  return rows[0] ?? null;
};

export const markConfirmed = async (db: dbClient, publicId: string) => {
  await db
    .update(cardUnblockAck)
    .set({ confirmedAt: new Date() })
    .where(
      and(
        eq(cardUnblockAck.publicId, publicId),
        isNull(cardUnblockAck.confirmedAt),
      ),
    );
};

/**
 * Pending acks due for an hourly re-remind (unconfirmed, within the cap).
 * `limit` caps how many are returned per call — a blast-radius guard so one
 * poller tick can't fire a huge burst of DMs; remaining due acks are picked
 * up on subsequent ticks.
 *
 * Due = unconfirmed AND (never reminded OR reminded >= 1 real hour ago) AND
 * still within the reminder cap. The `>= 1 hour` check runs against HKT-frame
 * values so the `new Date()`-written column and `now()` share one clock.
 */
export const getDueReminders = async (db: dbClient, limit?: number) => {
  const nowRows = await db.execute(
    sql`SELECT (now() AT TIME ZONE 'Asia/Hong_Kong') AS hkt_now`,
  );
  const hktNow =
    (nowRows.rows[0] as { hktNow?: Date | null | undefined })?.hktNow ??
    new Date();

  const candidates: Array<{
    publicId: string;
    mattermostUserId: string;
    messageText: string;
    createdAt: Date | null;
    lastRemindedAt: Date | null;
    confirmedAt: Date | null;
  }> = await db
    .select({
      publicId: cardUnblockAck.publicId,
      mattermostUserId: cardUnblockAck.mattermostUserId,
      messageText: cardUnblockAck.messageText,
      createdAt: cardUnblockAck.createdAt,
      lastRemindedAt: cardUnblockAck.lastRemindedAt,
      confirmedAt: cardUnblockAck.confirmedAt,
    })
    .from(cardUnblockAck)
    .where(
      and(
        isNull(cardUnblockAck.confirmedAt),
        sql`${cardUnblockAck.createdAt} >= (${hktNow}::timestamp) - interval '${sql.raw(
          String(REMINDER_CAP_DAYS),
        )} days'`,
      ),
    );

  if (limit != null && candidates.length === 0) return [];

  const due: typeof candidates = [];
  for (const row of candidates) {
    if (row.confirmedAt) continue; // already confirmed
    const lastReminded = row.lastRemindedAt;
    const isDue =
      lastReminded == null ||
      toHktMs(lastReminded) <= toHktMs(hktNow) - 60 * 60 * 1000;
    if (isDue) due.push(row);
  }

  return (limit ? due.slice(0, limit) : due).map(
    ({ publicId, mattermostUserId, messageText }) => ({
      publicId,
      mattermostUserId,
      messageText,
    }),
  );
};

export const markReminded = async (db: dbClient, publicId: string) => {
  await db
    .update(cardUnblockAck)
    .set({ lastRemindedAt: new Date() })
    .where(eq(cardUnblockAck.publicId, publicId));
};
