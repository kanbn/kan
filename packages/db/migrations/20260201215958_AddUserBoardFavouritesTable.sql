CREATE TABLE IF NOT EXISTS "user_board_favorites" (
	"userId" uuid NOT NULL,
	"boardId" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_board_favorites_userId_boardId_pk" PRIMARY KEY("userId","boardId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_board_favorites" ADD CONSTRAINT "user_board_favorites_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_board_favorites" ADD CONSTRAINT "user_board_favorites_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_board_favorite_user_idx" ON "user_board_favorites" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_board_favorite_board_idx" ON "user_board_favorites" USING btree ("boardId");