CREATE TYPE "public"."card_priority" AS ENUM('urgent', 'high', 'medium', 'low');--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.priority.set' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.priority.changed' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.priority.removed' BEFORE 'card.archived';--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "fromPriority" varchar(20);--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "toPriority" varchar(20);--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "priority" "card_priority";