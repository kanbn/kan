import { eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { slugChecks, slugs } from "@kan/db/schema";

export const getWorkspaceSlug = (db: dbClient, slug: string) => {
  return db.query.slugs.findFirst({
    columns: {
      slug: true,
      type: true,
    },
    where: eq(slugs.slug, slug),
  });
};

export const createWorkspaceSlugCheck = (
  db: dbClient,
  input: {
    slug: string;
    userId: string;
    available: boolean;
    reserved: boolean;
  },
) => {
  return db.insert(slugChecks).values({
    slug: input.slug,
    available: input.available,
    reserved: input.reserved,
    createdBy: input.userId,
  });
};
