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
    /**
     * Better-auth behind proxies (Nginx/Cloudflare) can sometimes fail to parse the protocol
     * if headers are incorrectly set or if there are multiple values in X-Forwarded-Proto.
     * We sanitize these headers here to ensure better-auth gets a clean protocol and host.
     */
    const forwardedProto = req.headers["x-forwarded-proto"];
    if (forwardedProto) {
      const p = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
      req.headers["x-forwarded-proto"] = p?.split(",")[0]?.trim();
    }

    const forwardedHost = req.headers["x-forwarded-host"];
    if (forwardedHost) {
      const h = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
      req.headers["host"] = h?.split(",")[0]?.trim();
    }

    return await authHandler(req, res);
  },
);
