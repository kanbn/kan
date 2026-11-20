import type { NextApiRequest, NextApiResponse } from "next";

import { proxyToApi } from "~/utils/api-proxy";

// Better Auth runs in apps/api; this keeps /api/auth on the web origin so
// cookies stay first-party and OAuth callback URLs don't change.
export const config = { api: { bodyParser: false } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyToApi(req, res, req.url ?? "");
}
