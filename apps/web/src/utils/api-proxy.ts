import type { NextApiRequest, NextApiResponse } from "next";

import { getClientIp } from "@kan/server/utils/rateLimit";
import { env } from "@kan/shared/env";

import { env as serverEnv } from "~/env";

const FORWARDED_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "stripe-signature",
  "user-agent",
  "x-api-key",
  "x-file-content-type",
  "x-original-filename",
];

const readBody = async (req: NextApiRequest) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer));
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

// Routes using this must set `bodyParser: false` so the raw body can be read.
export async function proxyToApi(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
) {
  const apiBaseUrl = serverEnv.KAN_API_URL || env("NEXT_PUBLIC_API_BASE_URL");
  if (!apiBaseUrl)
    return res.status(503).json({ message: "API service not configured" });

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  // Otherwise the API rate-limits every user under this server's IP.
  headers.set(
    serverEnv.RATE_LIMIT_IP_HEADER?.toLowerCase() || "x-forwarded-for",
    getClientIp(req.headers, req.socket.remoteAddress),
  );

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const upstream = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method: req.method,
    headers,
    body: hasBody ? await readBody(req) : undefined,
    redirect: "manual",
  });

  res.status(upstream.status);
  for (const name of ["content-type", "location"]) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.send(Buffer.from(await upstream.arrayBuffer()));
}
