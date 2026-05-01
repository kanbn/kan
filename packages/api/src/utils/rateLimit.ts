import type { NextApiRequest, NextApiResponse } from "next";
import {
  RateLimiterRedis,
  RateLimiterMemory,
} from "rate-limiter-flexible";

import { getRedisClient } from "@kan/db/redis";
import { createLogger } from "@kan/logger";

const log = createLogger("rateLimit");

export interface RateLimitOptions {
  points?: number;
  duration?: number;
  identifier?: (req: NextApiRequest) => string | Promise<string>;
  errorMessage?: string;
}

const defaultIdentifier = (req: NextApiRequest): string => {
  // Try to identify the IP address of the request
  const forwardedFor = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const cfConnectingIp = req.headers["cf-connecting-ip"];

  const ip =
    (typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : null) ??
    (typeof realIp === "string" ? realIp : null) ??
    (typeof cfConnectingIp === "string" ? cfConnectingIp : null) ??
    req.socket.remoteAddress ??
    "unknown";

  return ip;
};

const DEFAULT_OPTIONS = {
  points: 100,
  duration: 60,
  errorMessage: "Too many requests, please try again later.",
  identifier: defaultIdentifier,
} as const;

function createRateLimiter(options: RateLimitOptions = {}) {
  const redis = getRedisClient();
  const points = options.points ?? DEFAULT_OPTIONS.points;
  const duration = options.duration ?? DEFAULT_OPTIONS.duration;

  // Use Redis if available, otherwise fall back to in-memory storage
  if (redis) {
    log.debug("Using Redis for rate limiting");
    return new RateLimiterRedis({
      storeClient: redis,
      points,
      duration,
    });
  }

  log.debug("Redis unavailable, falling back to in-memory rate limiting");
  return new RateLimiterMemory({
    points,
    duration,
  });
}

export function withRateLimit(
  options: RateLimitOptions,
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
  ) => Promise<unknown> | unknown,
) {
  const rateLimiter = createRateLimiter(options);
  const identifier = options.identifier ?? DEFAULT_OPTIONS.identifier;
  const errorMessage = options.errorMessage ?? DEFAULT_OPTIONS.errorMessage;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const id = await identifier(req);
      const key = `ratelimit_${id}`;

      await rateLimiter.consume(key);

      return await handler(req, res);
    } catch (error) {
      // rate-limiter-flexible throws an error with msBeforeNext or remainingPoints
      // when limit is exceeded. Check for these properties directly.
      if (
        error &&
        typeof error === "object" &&
        ("msBeforeNext" in error || "remainingPoints" in error)
      ) {
        return res.status(429).json({
          message: errorMessage,
        });
      }

      return await handler(req, res);
    }
  };
}

/**
 * Creates a per-user rate limiter for use in tRPC middlewares.
 * The returned function throws `{ rateLimited: true }` when the limit is exceeded
 * and resolves normally otherwise (including on unexpected errors, to avoid false positives).
 */
export function createPerUserRateLimiter(
  options: { points?: number; duration?: number } = {},
) {
  const limiter = createRateLimiter(options);

  return async (userId: string, keyPrefix: string): Promise<void> => {
    const key = `trpc:${keyPrefix}:${userId}`;
    try {
      await limiter.consume(key);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        ("msBeforeNext" in error || "remainingPoints" in error)
      ) {
        throw { rateLimited: true };
      }
      // Unexpected errors: don't block the request
      log.warn({ err: error, key }, "Rate limiter error, allowing request through");
    }
  };
}

