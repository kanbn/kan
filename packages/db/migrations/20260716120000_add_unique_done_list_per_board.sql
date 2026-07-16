-- Enforce a single Done list per board at the DB level (only among
-- non-deleted lists). The app also clears rivals before setting one, but this
-- partial unique index is the source of truth.
CREATE UNIQUE INDEX IF NOT EXISTS "unique_done_list_per_board"
  ON "list" ("boardId")
  WHERE "isDoneList" = true AND "deletedAt" IS NULL;
