import type { NextApiRequest, NextApiResponse } from "next";

import { createLogger } from "@kan/logger";
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

const log = createLogger("api-proxy");

const API_UNAVAILABLE = "API_UNAVAILABLE";
const UPGRADE_DOCS = "See https://github.com/kanbn/kan#upgrading";

const unavailable = (res: NextApiResponse, status: number, message: string) =>
  res.status(status).json({ code: API_UNAVAILABLE, message });

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
  const apiBaseUrl =
    serverEnv.KAN_API_URL ||
    env("NEXT_PUBLIC_API_BASE_URL") ||
    (serverEnv.NODE_ENV === "development" ? "http://localhost:4000" : "");
  if (!apiBaseUrl) {
    log.error(
      `KAN_API_URL is not set: the web app can't reach the Kan API. ${UPGRADE_DOCS}`,
    );
    return unavailable(res, 503, "API service not configured");
  }

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
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
      method: req.method,
      headers,
      body: hasBody ? await readBody(req) : undefined,
      redirect: "manual",
    });
  } catch (error) {
    log.error(
      { err: error, apiBaseUrl },
      `Can't reach the Kan API. Is the api container running? ${UPGRADE_DOCS}`,
    );
    return unavailable(res, 502, "API service unreachable");
  }

  res.status(upstream.status);
  for (const name of ["content-type", "location", "retry-after"]) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.send(Buffer.from(await upstream.arrayBuffer()));
}
