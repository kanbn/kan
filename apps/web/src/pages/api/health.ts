import type { NextApiRequest, NextApiResponse } from "next";

import { createDrizzleClient } from "@kan/db/client";

import { env } from "~/env";
import { getApiBaseUrl } from "~/utils/api-proxy";

// Without POSTGRES_URL the API owns the PGlite database; a second process
// opening it would corrupt it, so ask the API instead.
const db = env.POSTGRES_URL ? createDrizzleClient() : undefined;

// Used by container health checks, so a new deploy only takes traffic once it can reach the database.
export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (db) await db.$client.query("select 1");
    else if (!(await fetch(`${getApiBaseUrl()}/health`)).ok) throw new Error();
    return res.status(200).json({ status: "ok" });
  } catch {
    return res.status(503).json({ status: "error" });
  }
}
