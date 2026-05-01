import { createLogger } from "@kan/logger";

import type { BoardEvent, CardEvent } from "./types";

const log = createLogger("api:publisher");

interface WorkspaceEventPayload {
  workspacePublicId: string;
  scope: "board" | "card";
  event: BoardEvent | CardEvent;
  secret?: string;
}

const eventEndpoint = process.env.WEBSOCKET_INGEST_URL;
const eventSecret = process.env.WEBSOCKET_EVENT_SECRET;

const postEvent = async (payload: WorkspaceEventPayload) => {
  if (!eventEndpoint) {
    if (process.env.NODE_ENV !== "production") {
      log.warn("WEBSOCKET_INGEST_URL is not configured; skipping event");
    }
    return;
  }

  try {
    await fetch(eventEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        secret: eventSecret ?? undefined,
      }),
    });
  } catch (error) {
    log.error({ err: error }, "failed to publish workspace event");
  }
};

export const publishBoardEventToWebsocket = async (
  workspacePublicId: string,
  event: BoardEvent,
) => {
  await postEvent({ workspacePublicId, scope: "board", event });
};

export const publishCardEventToWebsocket = async (
  workspacePublicId: string,
  event: CardEvent,
) => {
  await postEvent({ workspacePublicId, scope: "card", event });
};
