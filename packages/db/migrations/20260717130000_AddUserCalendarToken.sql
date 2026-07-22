ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "calendarToken" varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS "user_calendarToken_unique" ON "user" ("calendarToken");
