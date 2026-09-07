CREATE TYPE "public"."card_cover_size" AS ENUM('normal', 'full');--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.cover' BEFORE 'card.archived';--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "coverColourCode" varchar(7);--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "coverSize" "card_cover_size" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_cover_colour_code_check" CHECK ("card"."coverColourCode" IS NULL OR "card"."coverColourCode" ~ '^#[0-9A-Fa-f]{6}$');