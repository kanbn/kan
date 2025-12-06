ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.dueDate.added' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.dueDate.updated' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.dueDate.removed' BEFORE 'card.archived';--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "fromDueDate" timestamp;--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "toDueDate" timestamp;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "dueDate" timestamp;