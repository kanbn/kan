import { eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { boards } from "@kan/db/schema";

export const getBoardSlug = (db: dbClient, slug: string) => {
  return db.query.boards.findFirst({
    columns: {
      slug: true,
    },
    where: eq(boards.slug, slug),
  });
};
