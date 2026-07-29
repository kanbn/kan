const POLL_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
const FIRST_RUN_DELAY_MS = 60 * 1000; // first run ~1 min after boot

interface GlobalWithScheduler {
  __cardNotificationsSchedulerStarted__?: boolean;
}

/**
 * Next.js instrumentation hook — runs once when the Node server boots. Polls the
 * database for due Mattermost card reminders + the daily overdue nudge (both
 * Mattermost DMs and Google Calendar recurring events) every 10 minutes, so no
 * external cron is required.
 *
 * IMPORTANT: Next evaluates this file in BOTH the Node.js and Edge runtimes
 * (e.g. for middleware). The Node-only deps below (drizzle/pg, mattermost,
 * google-calendar, pino) would crash the Edge bundle, so they are loaded with
 * dynamic imports that only run inside the `NEXT_RUNTIME === "nodejs"` guard.
 *
 * Because the queries select reminders whose computed fireAt <= now and overdue
 * cards whose dueDate < now, polling on an interval is safe: each reminder
 * fires within ~10 min of its time, and anything missed while the server was
 * down is caught up on the next poll. Cards that are done (isDone) are excluded
 * by the queries, so notifying stops automatically when a card is completed.
 *
 * Set DISABLE_CARD_NOTIFICATIONS_CRON=true to opt out. The HTTP endpoint at
 * /api/cron/card-notifications remains available for ad-hoc / external runs.
 */
export async function register(): Promise<void> {
  // Only run in the long-lived Node.js server runtime (not edge, not build).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalWithScheduler = globalThis as unknown as GlobalWithScheduler;
  if (globalWithScheduler.__cardNotificationsSchedulerStarted__) return;
  globalWithScheduler.__cardNotificationsSchedulerStarted__ = true;

  const { createDrizzleClient } = await import("@banana/db/client");
  const reminderRepo = await import(
    "@banana/db/repository/cardNotification.repo"
  );
  const { sendCardReminderMattermost, sendOverdueCardMattermost } = await import(
    "@banana/api/utils/mattermost"
  );
  const {
    ensureOverdueCalendarEvent,
    getValidAccessToken,
  } = await import("@banana/api/utils/googleCalendar");
  const { createLogger } = await import("@banana/logger");
  const log = createLogger("card-notifications-scheduler");

  if (process.env.DISABLE_CARD_NOTIFICATIONS_CRON === "true") {
    log.info("Local card-notifications scheduler disabled by env");
    return;
  }

  const db = createDrizzleClient();

  const tick = async () => {
    try {
      const now = new Date();
      let processed = 0;
      let failed = 0;
      let overdueNudged = 0;

      // 1) One-shot Mattermost reminders.
      const reminders = await reminderRepo.getDueMattermostReminders(db, now);
      for (const reminder of reminders) {
        try {
          await sendCardReminderMattermost(db, {
            cardPublicId: reminder.cardPublicId,
            cardId: reminder.cardId,
            title: reminder.title,
            dueDate: reminder.dueDate,
          });
          await reminderRepo.markDelivered(db, reminder.notificationPublicId);
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
      const overdue = await reminderRepo.getOverdueCardsWithMembers(db, now);
      for (const m of overdue) {
        const today9am = reminderRepo.applyTimeOfDay(
          now,
          "09:00",
          m.memberTimezone,
        );
        if (now.getTime() < today9am.getTime()) continue;

        const nudgeDate = reminderRepo.localDateKey(now, m.memberTimezone);
        if (
          await reminderRepo.hasNudgedToday(db, {
            cardId: m.cardId,
            userId: m.userId,
            nudgeDate,
          })
        ) {
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
          await reminderRepo.recordNudge(db, {
            cardId: m.cardId,
            userId: m.userId,
            nudgeDate,
          });
          overdueNudged++;
        } catch (error) {
          log.error(
            { err: error, cardId: m.cardId, userId: m.userId },
            "Failed to send overdue nudge",
          );
        }

        // Google Calendar: ensure a daily 9am overdue event exists for them.
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

      if (reminders.length > 0 || overdueNudged > 0) {
        log.info(
          { considered: reminders.length, processed, failed, overdueNudged },
          "card-notifications tick",
        );
      }
    } catch (error) {
      log.error({ err: error }, "card-notifications scheduler tick failed");
    }
  };

  setTimeout(tick, FIRST_RUN_DELAY_MS);
  setInterval(tick, POLL_INTERVAL_MS);

  log.info(
    { pollIntervalMs: POLL_INTERVAL_MS },
    "Local card-notifications scheduler started",
  );
}
