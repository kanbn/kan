import type { IncomingMessage, ServerResponse } from "node:http";

import type { BoardEvent, CardEvent } from "@kan/api/events";
import { publishBoardEvent, publishCardEvent } from "@kan/api/events";

import { websocketConfig } from "~/config";
import { logger } from "~/logger";

interface WorkspaceEventPayload {
  workspacePublicId: string;
  scope: "board" | "card";
  event: BoardEvent | CardEvent;
  secret?: string;
}

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

const isBoardEvent = (
  payload: WorkspaceEventPayload,
): payload is WorkspaceEventPayload & { event: BoardEvent } => {
  return payload.scope === "board";
};

const isCardEvent = (
  payload: WorkspaceEventPayload,
): payload is WorkspaceEventPayload & { event: CardEvent } => {
  return payload.scope === "card";
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

  if (req.headers["content-type"] !== "application/json") {
    res.statusCode = 415;
    res.end();
    return;
  }

  let payload: WorkspaceEventPayload;

  try {
    const body = await readBody(req);
    payload = JSON.parse(body) as WorkspaceEventPayload;
  } catch (error) {
    logger.error("failed to parse event payload", error);
    res.statusCode = 400;
    res.end();
    return;
  }

  if (
    !payload.workspacePublicId ||
    typeof payload.workspacePublicId !== "string"
  ) {
    res.statusCode = 400;
    res.end();
    return;
  }

  if (
    websocketConfig.ingest.secret &&
    payload.secret !== websocketConfig.ingest.secret
  ) {
    logger.warn("rejecting event due to invalid secret");
    res.statusCode = 401;
    res.end();
    return;
  }

  if (isBoardEvent(payload)) {
    publishBoardEvent(payload.workspacePublicId, payload.event);
  } else if (isCardEvent(payload)) {
    publishCardEvent(payload.workspacePublicId, payload.event);
  } else {
    res.statusCode = 400;
    res.end();
    return;
  }

  res.statusCode = 204;
  res.end();
};
