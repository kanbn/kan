import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";

import { createLogger } from "@kan/logger";

import * as schema from "./schema";

const log = createLogger("db");

export type dbClient = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

export const createDrizzleClient = (): dbClient => {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    log.warn("POSTGRES_URL not set, falling back to PGLite");

    const client = new PGlite({
      dataDir: "./pgdata",
      extensions: { uuid_ossp },
    });
    const db = drizzlePgLite(client, { schema });

    migrate(db, { migrationsFolder: "../../packages/db/migrations" });

    return db as unknown as dbClient;
  }

  const pool = new Pool({
    connectionString,
  });

  return drizzlePg(pool, { schema }) as dbClient;
};
