ALTER TABLE "card" ADD COLUMN "isDone" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "isDoneList" boolean NOT NULL DEFAULT false;