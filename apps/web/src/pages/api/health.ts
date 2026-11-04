import type { NextApiRequest, NextApiResponse } from "next";

import { createDrizzleClient } from "@kan/db/client";

const db = createDrizzleClient();

// Used by container health checks, so a new deploy only takes traffic once it can reach the database.
export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await db.$client.query("select 1");
    return res.status(200).json({ status: "ok" });
  } catch {
    return res.status(503).json({ status: "error" });
  }
}
