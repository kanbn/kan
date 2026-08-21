CREATE TABLE IF NOT EXISTS "cron_job_state" (
	"jobName" varchar(255) NOT NULL,
	"lastRunAt" timestamp NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "cron_job_state_job_name_idx" ON "cron_job_state" ("jobName");

ALTER TABLE "cron_job_state" ENABLE ROW LEVEL SECURITY;