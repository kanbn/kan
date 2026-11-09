import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";

import { getRedisClient } from "@kan/db/redis";

export const RATE_LIMITER = Symbol("RATE_LIMITER");

// Mirrors the v1 REST tRPC endpoint's limits (apps/web/src/pages/api/v1/[...trpc].ts)
// — apps/api is that endpoint's eventual successor, so new routes should see
// the same budget, not a different one, while both exist side by side.
const POINTS = 600;
const DURATION = 60;

export function createRateLimiter() {
  const redis = getRedisClient();
  // Own key prefix: kan's existing rate limiters (web, trpc, v1 REST) all share
  // one unprefixed Redis keyspace per identifier today — apps/api gets its own
  // so the two systems' budgets can't bleed into each other during migration.
  return redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: "kan-api-rl",
        points: POINTS,
        duration: DURATION,
      })
    : new RateLimiterMemory({
        keyPrefix: "kan-api-rl",
        points: POINTS,
        duration: DURATION,
      });
}
