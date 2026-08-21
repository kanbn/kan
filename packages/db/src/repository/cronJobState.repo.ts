import { eq } from "drizzle-orm";

import type { dbClient } from "@banana/db/client";
import { cronJobState } from "@banana/db/schema";

/**
 * Get the last run time for a cron job. Returns null if the job has never run.
 */
export const getLastRunTime = async (
  db: dbClient,
  jobName: string,
): Promise<Date | null> => {
  const rows = await db
    .select({ lastRunAt: cronJobState.lastRunAt })
    .from(cronJobState)
    .where(eq(cronJobState.jobName, jobName))
    .limit(1);

  return rows[0]?.lastRunAt ?? null;
};

/**
 * Record/update the last run time for a cron job.
 * Uses ON CONFLICT to upsert: if the job already has a row, update it.
 */
export const recordRunTime = async (
  db: dbClient,
  jobName: string,
  runAt: Date,
): Promise<void> => {
  await db
    .insert(cronJobState)
    .values({ jobName, lastRunAt: runAt })
    .onConflictDoUpdate({
      target: [cronJobState.jobName],
      set: { lastRunAt: runAt },
    });
};

/**
 * Constants for the card-notifications scheduler throttle.
 * The in-process scheduler (instrumentation.ts) ticks every 10 minutes, but we
 * only run the Mattermost send logic once per MIN_INTERVAL_MS (default 1 hour).
 */
export const CARD_NOTIFICATIONS_JOB_NAME = "card-notifications";
export const CARD_NOTIFICATIONS_MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour