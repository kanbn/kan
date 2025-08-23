ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.customfield.added' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.customfield.updated' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.customfield.removed' BEFORE 'card.archived';