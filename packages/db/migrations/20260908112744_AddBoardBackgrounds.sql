ALTER TABLE "board" ADD COLUMN "backgroundColourCode" varchar(7);--> statement-breakpoint
ALTER TABLE "board" ADD COLUMN "backgroundImageKey" varchar(500);--> statement-breakpoint
ALTER TABLE "board" ADD CONSTRAINT "board_background_colour_code_check" CHECK ("board"."backgroundColourCode" IS NULL OR "board"."backgroundColourCode" ~ '^#[0-9A-Fa-f]{6}$');