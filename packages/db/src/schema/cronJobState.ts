import { pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Tracks the last successful run time for cron jobs. Used to enforce a minimum
 * interval between runs — e.g. the card-notifications cron fires every 10
 * minutes via the scheduler, but should only process Mattermost reminders once
 * per hour.
 */
export const cronJobState = pgTable(
  "cron_job_state",
  {
    jobName: varchar("jobName", { length: 255 }).notNull(),
    lastRunAt: timestamp("lastRunAt").notNull(),
  },
  (table) => [
    uniqueIndex("cron_job_state_job_name_idx").on(table.jobName),
  ],
).enableRLS();