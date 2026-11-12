import type { NextApiRequest } from "next";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";

const db = createDrizzleClient();
export const auth = initAuth(db);

/** Database client and signed-in user for a Next.js API route. */
export const createNextApiContext = async (req: NextApiRequest) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  return { db, user: session?.user };
};
