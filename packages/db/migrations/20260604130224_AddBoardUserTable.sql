CREATE TABLE IF NOT EXISTS "board_user" (
	"userId" uuid NOT NULL,
	"boardId" bigint NOT NULL,
	"position" integer NOT NULL,
	"isFavourite" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_user_userId_boardId_pk" PRIMARY KEY("userId","boardId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_user" ADD CONSTRAINT "board_user_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_user" ADD CONSTRAINT "board_user_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_user_user_idx" ON "board_user" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_user_board_idx" ON "board_user" USING btree ("boardId");--> statement-breakpoint
-- Seed board_user for every (active member, non-deleted board) pair. Favourites
-- (migrated from user_board_favorites) and non-favourites form independent
-- position sequences per user, board type and archive status, each starting at 0.
INSERT INTO "board_user" ("userId", "boardId", "position", "isFavourite", "createdAt")
SELECT
  wm."userId",
  b."id",
  (ROW_NUMBER() OVER (
    PARTITION BY
      wm."userId",
      b."type",
      b."isArchived",
      (CASE WHEN ubf."userId" IS NOT NULL THEN 1 ELSE 0 END)
    ORDER BY b."createdAt", b."id"
  ) - 1)::integer AS position,
  CASE WHEN ubf."userId" IS NOT NULL THEN true ELSE false END AS "isFavourite",
  now()
FROM "workspace_members" wm
JOIN "board" b ON b."workspaceId" = wm."workspaceId" AND b."deletedAt" IS NULL
LEFT JOIN "user_board_favorites" ubf
  ON ubf."userId" = wm."userId" AND ubf."boardId" = b."id"
WHERE wm."userId" IS NOT NULL
  AND wm."deletedAt" IS NULL
  AND wm."status" = 'active'
ON CONFLICT ("userId", "boardId") DO NOTHING;