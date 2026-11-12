import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "next-runtime-env";
import cors from "nextjs-cors";

import { createLogger } from "@kan/logger";
import {
  tokenOrIpIdentifier,
  withRateLimit,
} from "@kan/server/utils/rateLimit";

import { env as appEnv } from "~/env";

// Serves the public REST API (API keys, the MCP server, /api/v1/openapi.json)
// and, when NEXT_PUBLIC_API_BASE_URL is unset, the app's own API calls.
export const config = { api: { bodyParser: false } };

const log = createLogger("api-proxy");

const FORWARDED_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
  "x-api-key",
  "x-request-id",
  "x-real-ip",
  "cf-connecting-ip",
  "user-agent",
];

const DROPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "transfer-encoding",
  "set-cookie",
]);

const API_UNAVAILABLE = "API_UNAVAILABLE";

const readBody = async (req: NextApiRequest) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer));
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

const unavailable = (res: NextApiResponse, status: number, message: string) =>
  res.status(status).json({ code: API_UNAVAILABLE, message });

export default withRateLimit(
  { points: 600, duration: 60, identifier: tokenOrIpIdentifier },
  async (req: NextApiRequest, res: NextApiResponse) => {
    await cors(req, res);

    const apiBaseUrl =
      appEnv.KAN_API_URL ??
      env("NEXT_PUBLIC_API_BASE_URL") ??
      (appEnv.NODE_ENV === "development" ? "http://localhost:4000" : undefined);
    if (!apiBaseUrl) {
      log.error(
        "KAN_API_URL is not set: the web app can't reach the Kan API. See https://github.com/kanbn/kan#upgrading",
      );
      return unavailable(res, 503, "API service not configured");
    }

    const target = `${apiBaseUrl.replace(/\/$/, "")}${(req.url ?? "").replace(/^\/api\/v1/, "")}`;

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = req.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }
    const forwardedFor = req.headers["x-forwarded-for"];
    const clientIp =
      typeof forwardedFor === "string"
        ? forwardedFor
        : req.socket.remoteAddress;
    if (clientIp) headers.set("x-forwarded-for", clientIp);

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method: req.method,
        headers,
        body: hasBody ? await readBody(req) : undefined,
      });
    } catch (error) {
      log.error(
        { err: error, apiBaseUrl },
        "Can't reach the Kan API. Is the api container running? See https://github.com/kanbn/kan#upgrading",
      );
      return unavailable(res, 502, "API service unreachable");
    }

    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (!DROPPED_RESPONSE_HEADERS.has(name)) res.setHeader(name, value);
    });
    res.send(Buffer.from(await upstream.arrayBuffer()));
  },
);
