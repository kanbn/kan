import { useCallback } from "react";
import type { ReactNode } from "react";

import type { BoardEvent, CardEvent } from "@kan/api/events";

import { authClient } from "@kan/auth/client";
import { env } from "~/env";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface EventsProviderProps {
  children: ReactNode;
}

export const EventsProvider: React.FC<EventsProviderProps> = ({ children }) => {
  const utils = api.useUtils();
  const { workspace } = useWorkspace();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const websocketEnabled = Boolean(env.NEXT_PUBLIC_WEBSOCKET_URL);
  const workspacePublicId = workspace.publicId;
  const hasWorkspacePublicId = workspacePublicId.length === 12;
  const shouldSubscribe = websocketEnabled && hasWorkspacePublicId;

  const invalidateAll = useCallback(() => {
    void utils.board.byId.invalidate();
    void utils.board.all.invalidate();
    void utils.card.byId.invalidate();
  }, [utils]);

  const invalidateBoard = useCallback(() => {
    void utils.board.byId.invalidate();
  }, [utils]);

  const invalidateCard = useCallback(
    (cardPublicId: string) => {
      void utils.card.byId.invalidate({ cardPublicId });
    },
    [utils],
  );

  const clearCardFromCache = useCallback(
    (cardPublicId: string) => {
      utils.card.byId.setData({ cardPublicId }, () => undefined);
    },
    [utils],
  );

  const handleBoardEvent = useCallback(
    (event: BoardEvent) => {
      if (event.actorUserId && event.actorUserId === currentUserId) return;
      switch (event.type) {
        case "card.created":
        case "card.updated":
        case "card.deleted":
        case "checklist.changed":
        case "list.created":
        case "list.updated":
        case "list.deleted":
        case "label.changed":
          invalidateBoard();
          if ("cardPublicId" in event && event.cardPublicId) {
            invalidateCard(event.cardPublicId);
          }
          break;
        case "board.updated":
        case "board.deleted":
        case "board.created":
          invalidateBoard();
          void utils.board.all.invalidate();
          break;
        default:
          break;
      }
    },
    [currentUserId, invalidateBoard, invalidateCard, utils],
  );

  const handleCardEvent = useCallback(
    (event: CardEvent) => {
      if (event.actorUserId && event.actorUserId === currentUserId) return;
      switch (event.type) {
        case "comment.added":
        case "comment.updated":
        case "comment.deleted":
        case "label.added":
        case "label.removed":
        case "member.added":
        case "member.removed":
        case "checklist.changed":
        case "attachment.changed":
        case "updated":
        case "deleted":
          if (event.type === "deleted") {
            clearCardFromCache(event.cardPublicId);
          }
          invalidateCard(event.cardPublicId);
          invalidateBoard();
          break;
        default:
          break;
      }
    },
    [clearCardFromCache, currentUserId, invalidateBoard, invalidateCard],
  );

  api.events.board.useSubscription(
    { workspacePublicId },
    {
      enabled: shouldSubscribe,
      onData: handleBoardEvent,
      onStarted: invalidateAll,
      onError(error) {
        console.error("Board event subscription error", error);
      },
    },
  );

  api.events.card.useSubscription(
    { workspacePublicId },
    {
      enabled: shouldSubscribe,
      onData: handleCardEvent,
      onStarted: invalidateAll,
      onError(error) {
        console.error("Card event subscription error", error);
      },
    },
  );

  return <>{children}</>;
};
