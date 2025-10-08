import EventEmitter from "events";

// Central event bus for server-side real-time events
export const eventBus = new EventEmitter({ captureRejections: true });

// Increase the max listeners to avoid warnings on many subscribers per board/card
eventBus.setMaxListeners(1000);

// Event payloads
export type BoardEvent =
  | {
      scope: "board";
      type: "card.created" | "card.updated" | "card.deleted";
      boardId: number;
      cardPublicId: string;
      // Optional context
      listPublicId?: string;
      // Fields changed (for updated)
      changes?: Partial<{
        title: string | null | undefined;
        description: string | null | undefined;
        listPublicId: string | undefined;
        index: number | undefined;
      }>;
    }
  | {
      scope: "board";
      type: "list.created" | "list.updated" | "list.deleted";
      boardId: number;
      listPublicId: string;
      name?: string;
      index?: number;
    }
  | {
      scope: "board";
      type: "checklist.changed";
      boardId: number;
      cardPublicId: string;
    };

export type CardEvent =
  | {
      scope: "card";
      type: "comment.added" | "comment.updated" | "comment.deleted";
      cardId: number;
      cardPublicId: string;
      commentPublicId: string;
      comment?: string;
    }
  | {
      scope: "card";
      type: "label.added" | "label.removed";
      cardId: number;
      cardPublicId: string;
      labelPublicId: string;
    }
  | {
      scope: "card";
      type: "member.added" | "member.removed";
      cardId: number;
      cardPublicId: string;
      workspaceMemberPublicId: string;
    }
  | {
      scope: "card";
      type: "checklist.changed";
      cardId: number;
      cardPublicId: string;
    }
  | {
      scope: "card";
      type: "updated" | "deleted";
      cardId: number;
      cardPublicId: string;
      changes?: Partial<{
        title: string | null | undefined;
        description: string | null | undefined;
        listPublicId: string | undefined;
        index: number | undefined;
      }>;
    };

export type AnyEvent = BoardEvent | CardEvent;

export const boardTopic = (boardId: number) => `board:${boardId}` as const;
export const cardTopic = (cardId: number) => `card:${cardId}` as const;

export function emitBoardEvent(boardId: number, event: BoardEvent) {
  eventBus.emit(boardTopic(boardId), event);
}

export function emitCardEvent(cardId: number, event: CardEvent) {
  eventBus.emit(cardTopic(cardId), event);
}
