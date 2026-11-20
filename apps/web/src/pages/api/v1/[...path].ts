import type { NextApiRequest, NextApiResponse } from "next";
import cors from "nextjs-cors";

import {
  tokenOrIpIdentifier,
  withRateLimit,
} from "@kan/server/utils/rateLimit";

import { proxyToApi } from "~/utils/api-proxy";

// The public REST API (API keys, the MCP server, /api/v1/openapi.json) is
// served by apps/api; this keeps its long-standing /api/v1 address.
export const config = { api: { bodyParser: false } };

export default withRateLimit(
  {
    keyPrefix: "api-v1",
    points: 600,
    duration: 60,
    identifier: tokenOrIpIdentifier,
  },
  async (req: NextApiRequest, res: NextApiResponse) => {
    await cors(req, res);
    return proxyToApi(req, res, (req.url ?? "").replace(/^\/api\/v1/, ""));
  },
);
