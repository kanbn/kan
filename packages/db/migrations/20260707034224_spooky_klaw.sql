ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.blocker.added' BEFORE 'card.updated.comment.added';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.blocker.removed' BEFORE 'card.updated.comment.added';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_card_blocking" (
	"cardId" bigint NOT NULL,
	"blockerCardId" bigint NOT NULL,
	CONSTRAINT "_card_blocking_cardId_blockerCardId_pk" PRIMARY KEY("cardId","blockerCardId")
);
--> statement-breakpoint
ALTER TABLE "_card_blocking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_card_blocking" ADD CONSTRAINT "_card_blocking_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_card_blocking" ADD CONSTRAINT "_card_blocking_blockerCardId_card_id_fk" FOREIGN KEY ("blockerCardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
