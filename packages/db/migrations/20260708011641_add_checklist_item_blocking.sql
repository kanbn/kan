ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.checklist.item.blocker.removed' BEFORE 'card.updated.comment.added';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.checklist.item.blocker.added' BEFORE 'card.updated.checklist.item.blocker.removed';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_checklist_item_blocking" (
	"checklistItemId" bigint NOT NULL,
	"blockerCardId" bigint NOT NULL,
	CONSTRAINT "_checklist_item_blocking_checklistItemId_blockerCardId_pk" PRIMARY KEY("checklistItemId","blockerCardId")
);--> statement-breakpoint
ALTER TABLE "_checklist_item_blocking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_checklist_item_blocking" ADD CONSTRAINT "_checklist_item_blocking_checklistItemId_card_checklist_item_id_fk" FOREIGN KEY ("checklistItemId") REFERENCES "public"."card_checklist_item"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_checklist_item_blocking" ADD CONSTRAINT "_checklist_item_blocking_blockerCardId_card_id_fk" FOREIGN KEY ("blockerCardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;