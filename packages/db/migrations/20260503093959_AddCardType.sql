CREATE TYPE "public"."card_type" AS ENUM('spike', 'research', 'coding', 'analyze', 'bug', 'feedback', 'suggestion');--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.type' BEFORE 'card.updated.index';--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "fromCardType" "card_type";--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "toCardType" "card_type";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "type" "card_type" DEFAULT 'coding' NOT NULL;