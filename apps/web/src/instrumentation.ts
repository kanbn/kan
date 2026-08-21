const POLL_INTERVAL_MS = 60 * 1000; // check for due notifications every minute
const FIRST_RUN_DELAY_MS = 60 * 1000;

interface GlobalWithScheduler {
  __cardNotificationsSchedulerStarted__?: boolean;
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalWithScheduler = globalThis as unknown as GlobalWithScheduler;
  if (globalWithScheduler.__cardNotificationsSchedulerStarted__) return;
  globalWithScheduler.__cardNotificationsSchedulerStarted__ = true;

  const { createDrizzleClient } = await import("@banana/db/client");
  const reminderRepo = await import(
    "@banana/db/repository/cardNotification.repo"
  );
  const {
    sendCardReminderMattermost,
    sendOverdueCardMattermost,
    remindUnconfirmedUnblocks,
  } = await import("@banana/api/utils/mattermost");
  const { createLogger } = await import("@banana/logger");
  const log = createLogger("card-notifications-scheduler");

  if (process.env.DISABLE_CARD_NOTIFICATIONS_CRON === "true") {
    log.info("Local card-notifications scheduler disabled by env");
    return;
  }

  const db = createDrizzleClient();

  // No top-level throttle: each step is idempotent at the row level
  // (deliveredAt / hasNudgedToday / lastRemindedAt), so running the send
  // logic on every tick is safe and is what keeps latency to ~POLL_INTERVAL_MS.
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
      }

      // 3) Hourly re-remind of unacknowledged "blocker done" unblocks.
      try {
        const unblockReminded = await remindUnconfirmedUnblocks(db);
        if (unblockReminded > 0) {
          log.info({ unblockReminded }, "unblock ack reminders sent");
        }
      } catch (error) {
        log.error({ err: error }, "unblock ack remind step failed");
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

  // Self-scheduling: the next tick is scheduled only after the current one
  // finishes, so two ticks can never overlap (which could otherwise send
  // duplicate DMs if a tick ever ran slower than the poll interval).
  const scheduleTick = (delayMs: number) => {
    setTimeout(async () => {
      await tick();
      scheduleTick(POLL_INTERVAL_MS);
    }, delayMs);
  };
  scheduleTick(FIRST_RUN_DELAY_MS);

  log.info(
    { pollIntervalMs: POLL_INTERVAL_MS },
    "Local card-notifications scheduler started",
  );
}
