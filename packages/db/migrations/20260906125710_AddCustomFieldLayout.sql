CREATE TYPE "public"."custom_field_placement" AS ENUM('main', 'sidebar');--> statement-breakpoint
ALTER TABLE "custom_field" ADD COLUMN "sectionLabel" varchar(255);--> statement-breakpoint
ALTER TABLE "custom_field" ADD COLUMN "placement" "custom_field_placement" DEFAULT 'sidebar' NOT NULL;
