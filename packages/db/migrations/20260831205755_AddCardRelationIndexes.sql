CREATE INDEX IF NOT EXISTS "card_activity_card_created_at_idx" ON "card_activity" USING btree ("cardId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_attachment_card_created_at_idx" ON "card_attachment" USING btree ("cardId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_comments_card_id_idx" ON "card_comments" USING btree ("cardId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_checklist_item_checklist_index_idx" ON "card_checklist_item" USING btree ("checklistId","index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "card_checklist_card_index_idx" ON "card_checklist" USING btree ("cardId","index");