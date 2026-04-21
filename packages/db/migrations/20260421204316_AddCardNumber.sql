ALTER TABLE "card" ADD COLUMN "cardNumber" integer;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "cardPrefix" varchar(10) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "cardCounter" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Populate cardPrefix for existing workspaces from their name
UPDATE "workspace"
SET "cardPrefix" = (
  SELECT CASE
    WHEN array_length(words, 1) = 1 THEN UPPER(LEFT(words[1], 3))
    ELSE UPPER(LEFT(array_to_string(ARRAY(
      SELECT LEFT(w, 1) FROM unnest(words) AS w WHERE w != ''
    ), ''), 4))
  END
  FROM (
    SELECT regexp_split_to_array(trim("name"), '\s+') AS words
  ) sub
)
WHERE "cardPrefix" = '';--> statement-breakpoint

-- Assign sequential cardNumber to existing cards, ordered by createdAt, scoped to workspace
WITH numbered AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (PARTITION BY b."workspaceId" ORDER BY c."createdAt", c.id) AS rn
  FROM "card" c
  JOIN "list" l ON c."listId" = l.id
  JOIN "board" b ON l."boardId" = b.id
  WHERE c."deletedAt" IS NULL AND c."cardNumber" IS NULL
)
UPDATE "card" c
SET "cardNumber" = n.rn
FROM numbered n
WHERE c.id = n.id;--> statement-breakpoint

-- Update cardCounter on each workspace to the max cardNumber assigned
UPDATE "workspace" w
SET "cardCounter" = COALESCE((
  SELECT MAX(c."cardNumber")
  FROM "card" c
  JOIN "list" l ON c."listId" = l.id
  JOIN "board" b ON l."boardId" = b.id
  WHERE b."workspaceId" = w.id AND c."deletedAt" IS NULL AND c."cardNumber" IS NOT NULL
), 0);