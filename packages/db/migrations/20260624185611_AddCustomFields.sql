ALTER TABLE "board" ADD COLUMN "customFieldsConfig" text;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "customData" jsonb;