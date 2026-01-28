import { toNodeHandler } from "better-auth/node";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";
import { withRateLimit } from "@kan/api/utils/rateLimit";

export const config = { api: { bodyParser: false } };

export const auth = initAuth(createDrizzleClient());

const authHandler = toNodeHandler(auth.handler);

export default withRateLimit(
  { points: 100, duration: 60 },
  async (req, res) => {
    return await authHandler(req, res);
  },
);
