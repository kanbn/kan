import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "next-runtime-env";
import cors from "nextjs-cors";

import {
  tokenOrIpIdentifier,
  withRateLimit,
} from "@kan/server/utils/rateLimit";

// The public REST API (API keys, the MCP server, /api/v1/openapi.json) is
// served by apps/api; this keeps its long-standing /api/v1 address.
export const config = { api: { bodyParser: false } };

const FORWARDED_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
  "x-api-key",
];

const readBody = async (req: NextApiRequest) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer));
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

export default withRateLimit(
  { points: 600, duration: 60, identifier: tokenOrIpIdentifier },
  async (req: NextApiRequest, res: NextApiResponse) => {
    await cors(req, res);

    const apiBaseUrl = env("NEXT_PUBLIC_API_BASE_URL");
    if (!apiBaseUrl)
      return res.status(503).json({ message: "API service not configured" });

    const target = `${apiBaseUrl.replace(/\/$/, "")}${(req.url ?? "").replace(/^\/api\/v1/, "")}`;

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = req.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await readBody(req) : undefined,
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  },
);
