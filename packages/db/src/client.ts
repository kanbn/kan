import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { parse as parseConnectionString, toClientConfig } from "pg-connection-string";

import { createLogger } from "@kan/logger";

import * as schema from "./schema";

const log = createLogger("db");

const MIGRATIONS_FOLDER = "../../packages/db/migrations";

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

    void migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    return db as unknown as dbClient;
  }

  // pg treats sslmode=require as "verify the cert" unless parsed with
  // useLibpqCompat; passing connectionString itself (not discrete fields)
  // makes pg re-parse it without that flag, clobbering any fix.
  const parsedConnection = parseConnectionString(connectionString, {
    useLibpqCompat: true,
  });
  // no-verify is a pg-only extension, not a real libpq sslmode, so
  // useLibpqCompat doesn't recognize it and would silently start verifying.
  if (parsedConnection.sslmode === "no-verify" && typeof parsedConnection.ssl === "object") {
    parsedConnection.ssl = { ...parsedConnection.ssl, rejectUnauthorized: false };
  }
  const pool = new Pool(toClientConfig(parsedConnection));
  // Idle connections error when Postgres restarts; without a listener that crashes the process.
  // The pool drops the dead client and reconnects on the next query.
  pool.on("error", (err) => log.error({ err }, "Postgres pool error"));

  return drizzlePg(pool, { schema });
};

export const runMigrations = (db: dbClient) =>
  migratePg(db, { migrationsFolder: MIGRATIONS_FOLDER });
