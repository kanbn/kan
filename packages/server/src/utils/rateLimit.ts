import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";

import { getRedisClient } from "@kan/db/redis";
import { createLogger } from "@kan/logger";

import { getApiToken } from "./apiToken";

const log = createLogger("rateLimit");

export interface RateLimitOptions {
  keyPrefix: string;
  points?: number;
  duration?: number;
  identifier?: (req: NextApiRequest) => string | Promise<string>;
  errorMessage?: string;
  onRateLimit?: (
    req: NextApiRequest,
    res: NextApiResponse,
    errorMessage: string,
  ) => unknown;
}

type RequestHeaders = Record<string, string | string[] | undefined>;

const firstHeader = (headers: RequestHeaders, name: string) => {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
};

// Proxies append to X-Forwarded-For, so only the last entry was written by
// our own proxy; earlier entries are whatever the client sent.
export const getClientIp = (
  headers: RequestHeaders,
  remoteAddress?: string,
): string => {
  const trustedHeader = process.env.RATE_LIMIT_IP_HEADER?.toLowerCase();
  if (trustedHeader)
    return firstHeader(headers, trustedHeader) ?? remoteAddress ?? "unknown";

  return (
    firstHeader(headers, "x-forwarded-for")?.split(",").pop()?.trim() ||
    firstHeader(headers, "x-real-ip") ||
    remoteAddress ||
    "unknown"
  );
};

const defaultIdentifier = (req: NextApiRequest): string =>
  getClientIp(req.headers, req.socket.remoteAddress);

export const tokenOrIpIdentifier = (req: NextApiRequest): string => {
  const token = getApiToken(req);
  if (token) {
    return `token_${createHash("sha256").update(token).digest("hex")}`;
  }
  return defaultIdentifier(req);
};

const DEFAULT_OPTIONS = {
  points: 100,
  duration: 60,
  errorMessage: "Too many requests, please try again later.",
  identifier: defaultIdentifier,
} as const;

function createRateLimiter(options: RateLimitOptions) {
  const redis = getRedisClient();
  const limiterOptions = {
    keyPrefix: `kan-rl:${options.keyPrefix}`,
    points: options.points ?? DEFAULT_OPTIONS.points,
    duration: options.duration ?? DEFAULT_OPTIONS.duration,
  };

  return redis
    ? new RateLimiterRedis({ storeClient: redis, ...limiterOptions })
    : new RateLimiterMemory(limiterOptions);
}

const isLimitExceeded = (error: unknown) =>
  !!error &&
  typeof error === "object" &&
  ("msBeforeNext" in error || "remainingPoints" in error);

export function withRateLimit(
  options: RateLimitOptions,
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
  ) => Promise<unknown> | unknown,
) {
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return handler;
  }

  const rateLimiter = createRateLimiter(options);
  const identifier = options.identifier ?? DEFAULT_OPTIONS.identifier;
  const errorMessage = options.errorMessage ?? DEFAULT_OPTIONS.errorMessage;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await rateLimiter.consume(`ratelimit_${await identifier(req)}`);
    } catch (error) {
      if (isLimitExceeded(error)) {
        if (options.onRateLimit) {
          return options.onRateLimit(req, res, errorMessage);
        }
        return res.status(429).json({ message: errorMessage });
      }
      log.warn(
        { err: error, keyPrefix: options.keyPrefix },
        "Rate limiter unavailable, allowing request",
      );
    }

    return handler(req, res);
  };
}
