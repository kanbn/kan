import { EventEmitter } from "node:events";
import IoRedis from "ioredis";

import type { BoardEvent, CardEvent, NotificationEvent, WorkspaceEventScope } from "./types";
import { createLogger } from "@kan/logger";

const log = createLogger("api:events:bus");

// Local EventEmitter used for dispatch in all cases (Redis messages are forwarded here)
const emitter = new EventEmitter({ captureRejections: false });
emitter.setMaxListeners(0);

const channelFor = (workspacePublicId: string, scope: WorkspaceEventScope) =>
  `workspace:${workspacePublicId}:${scope}`;

const channelForUser = (userId: string) => `user:${userId}:notifications`;

// --- Redis Pub/Sub ---

let _redisSub: InstanceType<typeof IoRedis> | null = null;

/**
 * Returns a dedicated Redis subscriber connection, creating it lazily.
 * A separate connection is required because ioredis does not allow
 * commands and subscriptions on the same connection.
 */
function getRedisSubscriber(): InstanceType<typeof IoRedis> | null {
  if (_redisSub) return _redisSub;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  _redisSub = new IoRedis(redisUrl, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  _redisSub.on("error", (err: Error) =>
    log.error({ err }, "Redis subscriber connection error"),
  );

  // Forward all Redis pub/sub messages to the local EventEmitter
  _redisSub.on("message", (channel: string, message: string) => {
    try {
      emitter.emit(channel, JSON.parse(message));
    } catch (err) {
      log.error({ err, channel }, "Failed to parse Redis pub/sub message");
    }
  });

  return _redisSub;
}

/**
 * Returns a lazily-imported Redis publisher client, or null when Redis is not configured.
 * Uses ioredis directly to avoid the shared-connection restriction.
 */
let _redisPub: InstanceType<typeof IoRedis> | null = null;

function getRedisPublisher(): InstanceType<typeof IoRedis> | null {
  if (_redisPub) return _redisPub;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  _redisPub = new IoRedis(redisUrl, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
  });

  _redisPub.on("error", (err: Error) =>
    log.error({ err }, "Redis publisher connection error"),
  );

  return _redisPub;
}

/** Publish to Redis if available, otherwise emit locally. */
function publish(channel: string, event: unknown): void {
  const pub = getRedisPublisher();
  if (pub) {
    pub.publish(channel, JSON.stringify(event)).catch((err: unknown) => {
      log.error({ err, channel }, "Redis publish error");
    });
  } else {
    emitter.emit(channel, event);
  }
}

/**
 * Subscribe to a channel.
 * With Redis: adds the Redis subscription (if not already subscribed on this channel)
 * and registers the handler on the local emitter.
 * Without Redis: registers directly on the local emitter.
 * Returns an unsubscribe function.
 */
function subscribe<T>(
  channel: string,
  handler: (event: T) => void,
): () => void {
  const sub = getRedisSubscriber();
  if (sub) {
    sub.subscribe(channel).catch((err: unknown) => {
      log.error({ err, channel }, "Redis channel subscribe error");
    });
  }
  emitter.on(channel, handler as (...args: unknown[]) => void);

  return () => {
    emitter.off(channel, handler as (...args: unknown[]) => void);
    // Only unsubscribe from Redis when no local handlers remain for this channel
    if (sub && emitter.listenerCount(channel) === 0) {
      sub.unsubscribe(channel).catch((err: unknown) => {
        log.error({ err, channel }, "Redis channel unsubscribe error");
      });
    }
  };
}

type BoardHandler = (event: BoardEvent) => void;
type CardHandler = (event: CardEvent) => void;
type NotificationHandler = (event: NotificationEvent) => void;

export const publishBoardEvent = (
  workspacePublicId: string,
  event: BoardEvent,
) => {
  publish(channelFor(workspacePublicId, "board"), event);
};

export const publishCardEvent = (
  workspacePublicId: string,
  event: CardEvent,
) => {
  publish(channelFor(workspacePublicId, "card"), event);
};

export const subscribeToBoardEvents = (
  workspacePublicId: string,
  handler: BoardHandler,
) => subscribe(channelFor(workspacePublicId, "board"), handler);

export const subscribeToCardEvents = (
  workspacePublicId: string,
  handler: CardHandler,
) => subscribe(channelFor(workspacePublicId, "card"), handler);

export const publishNotificationEvent = (userId: string, event: NotificationEvent) => {
  publish(channelForUser(userId), event);
};

export const subscribeToNotificationEvents = (
  userId: string,
  handler: NotificationHandler,
) => subscribe(channelForUser(userId), handler);
