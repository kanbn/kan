CREATE UNIQUE INDEX IF NOT EXISTS "unique_done_list_per_board"
  ON "list" ("boardId")
  WHERE "isDoneList" = true AND "deletedAt" IS NULL;
