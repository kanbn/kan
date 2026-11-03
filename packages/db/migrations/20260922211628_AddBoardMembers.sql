CREATE TYPE "public"."board_member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "board_members" (
	"boardId" bigint NOT NULL,
	"workspaceMemberId" bigint NOT NULL,
	"role" "board_member_role" DEFAULT 'member' NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_members_boardId_workspaceMemberId_pk" PRIMARY KEY("boardId","workspaceMemberId")
);
--> statement-breakpoint
ALTER TABLE "board_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_members" ADD CONSTRAINT "board_members_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_members" ADD CONSTRAINT "board_members_workspaceMemberId_workspace_members_id_fk" FOREIGN KEY ("workspaceMemberId") REFERENCES "public"."workspace_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_members" ADD CONSTRAINT "board_members_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "board_members_workspace_member_idx" ON "board_members" USING btree ("workspaceMemberId");