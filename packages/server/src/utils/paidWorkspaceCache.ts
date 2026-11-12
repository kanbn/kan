import { createHash } from "crypto";

import { getRedisClient } from "@kan/db/redis";
import { createLogger } from "@kan/logger";

const log = createLogger("paidWorkspaceCache");

const TTL_SECONDS = 30;
const KEY_PREFIX = "mcp_paid_workspace:";

const memoryCache = new Map<string, number>();

function hashToken(apiToken: string): string {
  return createHash("sha256").update(apiToken).digest("hex");
}

export async function getCachedPaidWorkspaceEligibility(
  apiToken: string,
): Promise<boolean> {
  const key = `${KEY_PREFIX}${hashToken(apiToken)}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      return (await redis.get(key)) === "1";
    } catch (error) {
      log.warn(
        { err: error },
        "Failed to read paid workspace cache from Redis",
      );
      return false;
    }
  }

  const expiresAt = memoryCache.get(key);
  if (expiresAt === undefined) return false;
  if (expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return false;
  }
  return true;
}

export async function setCachedPaidWorkspaceEligibility(
  apiToken: string,
): Promise<void> {
  const key = `${KEY_PREFIX}${hashToken(apiToken)}`;
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.set(key, "1", "EX", TTL_SECONDS);
    } catch (error) {
      log.warn({ err: error }, "Failed to write paid workspace cache to Redis");
    }
    return;
  }

  memoryCache.set(key, Date.now() + TTL_SECONDS * 1000);
}

export function clearPaidWorkspaceCache(): void {
  memoryCache.clear();
}
