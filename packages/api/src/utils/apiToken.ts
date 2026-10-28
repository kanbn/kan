import type { NextApiRequest } from "next";

export function getApiToken(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  const bearerMatch = authorization?.match(/^Bearer (.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1] ?? null;
  }
  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }
  return null;
}
