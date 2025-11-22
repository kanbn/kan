import type { BoardEvent, CardEvent } from "./types";

interface WorkspaceEventPayload {
  workspacePublicId: string;
  scope: "board" | "card";
  event: BoardEvent | CardEvent;
  secret?: string;
}

const eventEndpoint = process.env.WEBSOCKET_EVENT_URL;
const eventSecret = process.env.WEBSOCKET_EVENT_SECRET;

const postEvent = async (payload: WorkspaceEventPayload) => {
  if (!eventEndpoint) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("WEBSOCKET_EVENT_URL is not configured; skipping event");
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
    console.error("failed to publish workspace event", error);
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
