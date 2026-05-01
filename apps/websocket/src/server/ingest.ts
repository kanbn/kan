import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { BoardEvent, CardEvent, NotificationEvent } from "@kan/api/events";
import { publishBoardEvent, publishCardEvent, publishNotificationEvent } from "@kan/api/events";
import { createLogger } from "@kan/logger";

import { websocketConfig } from "~/config";

const log = createLogger("websocket:ingest");

const MAX_INGEST_BODY_BYTES = 1_048_576; // 1 MiB

interface WorkspaceEventPayload {
  workspacePublicId: string;
  scope: "board" | "card";
  event: BoardEvent | CardEvent;
  /** @deprecated Pass the secret via the x-websocket-secret header instead. */
  secret?: string;
}

interface NotificationEventPayload {
  userId: string;
  scope: "notification";
  event: NotificationEvent;
  secret?: string;
}

type EventPayload = WorkspaceEventPayload | NotificationEventPayload;

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Uint8Array[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf: Uint8Array = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as string);
    total += buf.byteLength;
    if (total > MAX_INGEST_BODY_BYTES) {
      throw Object.assign(new Error("payload too large"), { code: "TOO_LARGE" });
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString("utf8");
};

const isBoardEvent = (
  payload: EventPayload,
): payload is WorkspaceEventPayload & { event: BoardEvent } => {
  return payload.scope === "board";
};

const isCardEvent = (
  payload: EventPayload,
): payload is WorkspaceEventPayload & { event: CardEvent } => {
  return payload.scope === "card";
};

const isNotificationEvent = (
  payload: EventPayload,
): payload is NotificationEventPayload => {
  return payload.scope === "notification";
};

const isValidSecret = (provided: string, expected: string): boolean => {
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
};

export const handleEventIngest = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return;
  }

  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.startsWith("application/json")) {
    res.statusCode = 415;
    res.end();
    return;
  }

  let payload: EventPayload;

  try {
    const body = await readBody(req);
    payload = JSON.parse(body) as EventPayload;
  } catch (error) {
    const isTooLarge =
      error instanceof Error &&
      (error as Error & { code?: string }).code === "TOO_LARGE";
    if (isTooLarge) {
      res.statusCode = 413;
      res.end();
      return;
    }
    log.error({ err: error }, "failed to parse event payload");
    res.statusCode = 400;
    res.end();
    return;
  }

  if (
    !payload.workspacePublicId ||
    typeof payload.workspacePublicId !== "string"
  ) {
    if (!isNotificationEvent(payload)) {
      res.statusCode = 400;
      res.end();
      return;
    }
  }

  if (isNotificationEvent(payload)) {
    if (!payload.userId || typeof payload.userId !== "string") {
      res.statusCode = 400;
      res.end();
      return;
    }
  }

  if (websocketConfig.ingest.secret) {
    // Prefer the header-based secret; fall back to body for one-release backward compat.
    const headerSecret = req.headers["x-websocket-secret"];
    let provided: string | undefined;

    if (typeof headerSecret === "string") {
      provided = headerSecret;
    } else if (typeof payload.secret === "string") {
      log.warn(
        "secret provided in request body is deprecated — use the x-websocket-secret header instead",
      );
      provided = payload.secret;
    }

    if (!provided || !isValidSecret(provided, websocketConfig.ingest.secret)) {
      log.warn("rejecting event due to invalid secret");
      res.statusCode = 401;
      res.end();
      return;
    }
  }

  if (isBoardEvent(payload)) {
    publishBoardEvent(payload.workspacePublicId, payload.event);
  } else if (isCardEvent(payload)) {
    publishCardEvent(payload.workspacePublicId, payload.event);
  } else if (isNotificationEvent(payload)) {
    publishNotificationEvent(payload.userId, payload.event);
  } else {
    res.statusCode = 400;
    res.end();
    return;
  }

  res.statusCode = 204;
  res.end();
};

