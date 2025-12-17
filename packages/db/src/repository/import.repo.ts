import { count, eq } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { imports } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getCount = async (db: dbClient) => {
  const result = await db.select({ count: count() }).from(imports);

  return result[0]?.count ?? 0;
};

export const create = async (
  db: dbClient,
  importInput: { source: string; createdBy: string },
) => {
  const [result] = await db
    .insert(imports)
    .values({
      publicId: generateUID(),
      source: "trello",
      createdBy: importInput.createdBy,
      status: "started",
    })
    .returning({ id: imports.id });

  return result;
};

export const update = async (
  db: dbClient,
  importInput: { status: "started" | "success" | "failed" },
  args: { importId: number },
) => {
  const [result] = await db
    .update(imports)
    .set({ status: importInput.status })
    .where(eq(imports.id, args.importId))
    .returning({ id: imports.id, status: imports.status });

  return result;
};
