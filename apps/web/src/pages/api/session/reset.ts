import type { NextApiRequest, NextApiResponse } from "next";

import { proxyToApi } from "~/utils/api-proxy";

// Stays on the web origin: only the web host can clear its own host-only
// session cookies.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return proxyToApi(req, res, (req.url ?? "").replace(/^\/api/, ""));
}
