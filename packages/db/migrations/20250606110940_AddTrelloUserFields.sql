ALTER TABLE "user" ADD COLUMN "trelloToken" varchar(255);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trelloConnected" boolean DEFAULT false NOT NULL;