import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite"; 
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { seed } from "./seed";

export type dbClient = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

export const createDrizzleClient = (): dbClient => {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.log("POSTGRES_URL environment variable is not set, using PGLite");

    const client = new PGlite({ dataDir: "./pgdata", extensions: { uuid_ossp }});
    const db = drizzlePgLite(client, { schema });

    migrate(db, { migrationsFolder: "../../packages/db/migrations" });

    return db as unknown as dbClient;
  }

  const pool = new Pool({
    connectionString,
  });

  var newDbPg =  drizzlePg(pool, { schema }) as dbClient;

  seed(newDbPg).catch((err) => {
    console.error("Error during seeding:", err)
  });

  return newDbPg;
};
