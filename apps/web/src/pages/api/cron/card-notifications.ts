import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@banana/api/trpc";
import { withApiLogging } from "@banana/api/utils/apiLogging";
import { withRateLimit } from "@banana/api/utils/rateLimit";
import {
  ensureOverdueCalendarEvent,
  getValidAccessToken,
} from "@banana/api/utils/googleCalendar";
import { sendCardReminderMattermost, sendOverdueCardMattermost } from "@banana/api/utils/mattermost";
import {
  applyTimeOfDay,
  getDueMattermostReminders,
  getOverdueCardsWithMembers,
  hasNudgedToday,
  localDateKey,
  markDelivered,
  recordNudge,
} from "@banana/db/repository/cardNotification.repo";
import { createLogger } from "@banana/logger";

const log = createLogger("cron-card-notifications");

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

interface CronResult {
  considered: number;
  processed: number;
  failed: number;
  overdueNudged: number;
}

/**
 * Fires due Mattermost card reminders + the daily overdue nudge (Mattermost DMs
 * and Google Calendar recurring events). Google Calendar one-shot reminders are
 * NOT handled here — they are written as events at create/update time. Only the
 * Mattermost channel needs a poller, because DMs can only be sent "now".
 *
 * Schedule externally (no vercel.json in this self-hosted setup), roughly every
 * 10 minutes. Example cron line (the minute field uses step syntax):
 */
//   */10 * * * * curl -fsS -X POST \
//     -H "x-admin-api-key: $KAN_ADMIN_API_KEY" \
//     https://app/api/cron/card-notifications
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResult | { error: string }>,
) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  // Admin auth — reuses the existing bot-sync admin key.
  const adminKey = process.env.KAN_ADMIN_API_KEY;
  if (!adminKey) {
    return res.status(500).json({ error: "Admin API key not configured." });
  }
  const providedKey = req.headers["x-admin-api-key"];
  if (
    typeof providedKey !== "string" ||
    !timingSafeEqual(providedKey, adminKey)
  ) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const { db } = await createNextApiContext(req);
  const now = new Date();

  // 1) One-shot Mattermost reminders.
  const reminders = await getDueMattermostReminders(db, now);

  let processed = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      await sendCardReminderMattermost(db, {
        cardPublicId: reminder.cardPublicId,
        cardId: reminder.cardId,
        title: reminder.title,
        dueDate: reminder.dueDate,
      });
      await markDelivered(db, reminder.notificationPublicId);
      processed++;
    } catch (error) {
      failed++;
      log.error(
        { err: error, notificationPublicId: reminder.notificationPublicId },
        "Failed to send card reminder",
      );
    }
  }

  // 2) Daily overdue nudge (per member, at their own 9am).
  let overdueNudged = 0;
  const overdue = await getOverdueCardsWithMembers(db, now);

  for (const m of overdue) {
    const today9am = applyTimeOfDay(now, "09:00", m.memberTimezone);
    if (now.getTime() < today9am.getTime()) continue; // not yet 9am for them

    const nudgeDate = localDateKey(now, m.memberTimezone);
    if (await hasNudgedToday(db, { cardId: m.cardId, userId: m.userId, nudgeDate })) {
      continue;
    }

    try {
      await sendOverdueCardMattermost(db, {
        cardPublicId: m.cardPublicId,
        cardId: m.cardId,
        title: m.title,
        dueDate: m.dueDate,
        memberEmail: m.email,
      });
      await recordNudge(db, { cardId: m.cardId, userId: m.userId, nudgeDate });
      overdueNudged++;
    } catch (error) {
      log.error(
        { err: error, cardId: m.cardId, userId: m.userId },
        "Failed to send overdue nudge",
      );
    }

    // Google Calendar: ensure a daily 9am overdue event exists for this member.
    try {
      const accessToken = await getValidAccessToken(db, m.userId);
      if (accessToken) {
        await ensureOverdueCalendarEvent(accessToken, {
          cardPublicId: m.cardPublicId,
          title: m.title,
          memberTimezone: m.memberTimezone,
        });
      }
    } catch (error) {
      log.error(
        { err: error, cardId: m.cardId, userId: m.userId },
        "Failed to ensure overdue GCal event",
      );
    }
  }

  return res.status(200).json({
    considered: reminders.length,
    processed,
    failed,
    overdueNudged,
  });
}

export default withRateLimit(
  { points: 30, duration: 60 },
  withApiLogging(handler),
);
