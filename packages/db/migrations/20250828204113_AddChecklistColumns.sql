ALTER TABLE "card_checklist_item" ADD COLUMN "itemValue" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "card_checklist_item" ADD COLUMN "itemIdentity" varchar(255);--> statement-breakpoint
ALTER TABLE "card_checklist_item" ADD COLUMN "quantity" integer;--> statement-breakpoint
ALTER TABLE "card_checklist_item" ADD COLUMN "wash" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "card_checklist_item" ADD COLUMN "iron" boolean DEFAULT false NOT NULL;