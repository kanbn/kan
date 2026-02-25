ALTER TYPE "public"."card_activity_type" ADD VALUE IF NOT EXISTS 'card.unarchived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE IF NOT EXISTS 'card.restored';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE IF NOT EXISTS 'card.deleted';--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp;--> statement-breakpoint

-- Grant card:archive to every role that already has card:delete
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wrp."workspaceRoleId", 'card:archive', true, NOW()
FROM "workspace_role_permissions" wrp
WHERE wrp."permission" = 'card:delete'
  AND wrp."granted" = true
  AND NOT EXISTS (
    SELECT 1 FROM "workspace_role_permissions" existing
    WHERE existing."workspaceRoleId" = wrp."workspaceRoleId"
      AND existing."permission" = 'card:archive'
  );
--> statement-breakpoint

-- Grant card:archive to every member that already has a card:delete override
INSERT INTO "workspace_member_permissions" ("workspaceMemberId", "permission", "granted", "createdAt")
SELECT wmp."workspaceMemberId", 'card:archive', wmp."granted", NOW()
FROM "workspace_member_permissions" wmp
WHERE wmp."permission" = 'card:delete'
  AND NOT EXISTS (
    SELECT 1 FROM "workspace_member_permissions" existing
    WHERE existing."workspaceMemberId" = wmp."workspaceMemberId"
      AND existing."permission" = 'card:archive'
  );
--> statement-breakpoint