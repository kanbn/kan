import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { IncomingMessage } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ReadableStream } from "stream/web";

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
  "x-tab-id",
];

const log = createLogger("api-proxy");

const API_UNAVAILABLE = "API_UNAVAILABLE";
const UPGRADE_DOCS =
  "See https://docs.kan.bn/self-hosting/introduction#separate-containers";

// localhost covers running from source, where `pnpm start` runs both apps.
export const getApiBaseUrl = () =>
  serverEnv.KAN_API_URL ||
  env("NEXT_PUBLIC_API_BASE_URL") ||
  "http://localhost:4000";

// Otherwise the API rate-limits every user under this server's IP.
export const getClientIpHeader = (req: IncomingMessage) => ({
  [serverEnv.RATE_LIMIT_IP_HEADER?.toLowerCase() || "x-forwarded-for"]:
    getClientIp(req.headers, req.socket.remoteAddress),
});

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
  const apiBaseUrl = getApiBaseUrl();

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  for (const [name, value] of Object.entries(getClientIpHeader(req))) {
    headers.set(name, value);
  }

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
  const passHeaders = (...names: string[]) => {
    for (const name of names) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
  };
  passHeaders("content-type", "location", "retry-after");
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);

  if (
    req.method === "GET" &&
    upstream.body &&
    upstream.headers.get("content-type")?.startsWith("text/event-stream")
  ) {
    // These stop the stream being compressed or buffered.
    passHeaders("cache-control", "x-accel-buffering");
    res.flushHeaders();
    // Also closes the API's side when the browser disconnects.
    await pipeline(
      Readable.fromWeb(upstream.body as ReadableStream),
      res,
    ).catch(() => undefined);
    return;
  }

  res.send(Buffer.from(await upstream.arrayBuffer()));
}
