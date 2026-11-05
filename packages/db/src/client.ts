import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { parse as parseConnectionString, toClientConfig } from "pg-connection-string";

import { createLogger } from "@kan/logger";

import * as schema from "./schema";

const log = createLogger("db");

export const pgliteExtensions = { pg_trgm, uuid_ossp };

export type dbClient = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

export const createDrizzleClient = (): dbClient => {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    log.warn("POSTGRES_URL not set, falling back to PGLite");

    const client = new PGlite({
      dataDir: "./pgdata",
      extensions: pgliteExtensions,
    });
    const db = drizzlePgLite(client, { schema });

    migrate(db, { migrationsFolder: "../../packages/db/migrations" });

    return db as unknown as dbClient;
  }

  // pg's own connection-string parsing ignores useLibpqCompat and treats
  // sslmode=require as "verify the cert" instead of libpq's "just encrypt",
  // so self-signed/private-CA Postgres servers fail with "self-signed
  // certificate" even when the url is correct. Parsing it ourselves and
  // passing discrete fields (not connectionString) avoids pg re-parsing it
  // the wrong way.
  const clientConfig = toClientConfig(
    parseConnectionString(connectionString, { useLibpqCompat: true }),
  );
  const pool = new Pool(clientConfig);
  // Idle connections error when Postgres restarts; without a listener that crashes the process.
  // The pool drops the dead client and reconnects on the next query.
  pool.on("error", (err) => log.error({ err }, "Postgres pool error"));

  return drizzlePg(pool, { schema }) as dbClient;
};
