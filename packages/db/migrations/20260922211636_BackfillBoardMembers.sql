-- Preserve existing access: add every current workspace member to every
-- regular board in their workspace. Each board gets exactly one admin: the
-- board's creator if they're still an active workspace member, otherwise
-- the earliest active workspace member, so no board starts with zero admins
-- (e.g. when createdBy is null, or the creator's own membership was removed).
WITH admin_candidate AS (
	SELECT DISTINCT ON (b."id")
		b."id" AS board_id,
		wm."id" AS workspace_member_id
	FROM "board" b
	INNER JOIN "workspace_members" wm ON wm."workspaceId" = b."workspaceId"
	WHERE b."deletedAt" IS NULL
		AND b."type" = 'regular'
		AND wm."deletedAt" IS NULL
		AND wm."status" <> 'removed'
	ORDER BY
		b."id",
		(wm."userId" IS NOT NULL AND wm."userId" = b."createdBy") DESC,
		wm."id" ASC
)
INSERT INTO "board_members" ("boardId", "workspaceMemberId", "role", "createdAt")
SELECT
	b."id",
	wm."id",
	CASE
		WHEN ac.workspace_member_id = wm."id" THEN 'admin'::"board_member_role"
		ELSE 'member'::"board_member_role"
	END,
	now()
FROM "board" b
INNER JOIN "workspace_members" wm ON wm."workspaceId" = b."workspaceId"
LEFT JOIN admin_candidate ac ON ac.board_id = b."id"
WHERE b."deletedAt" IS NULL
	AND b."type" = 'regular'
	AND wm."deletedAt" IS NULL
	AND wm."status" <> 'removed'
ON CONFLICT DO NOTHING;
