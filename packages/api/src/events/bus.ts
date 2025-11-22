import { EventEmitter } from "node:events";

import type { BoardEvent, CardEvent, WorkspaceEventScope } from "./types";

const emitter = new EventEmitter({ captureRejections: false });
emitter.setMaxListeners(0);

const channelFor = (workspacePublicId: string, scope: WorkspaceEventScope) =>
  `workspace:${workspacePublicId}:${scope}`;

type BoardHandler = (event: BoardEvent) => void;
type CardHandler = (event: CardEvent) => void;

export const publishBoardEvent = (
  workspacePublicId: string,
  event: BoardEvent,
) => {
  emitter.emit(channelFor(workspacePublicId, "board"), event);
};

export const publishCardEvent = (
  workspacePublicId: string,
  event: CardEvent,
) => {
  emitter.emit(channelFor(workspacePublicId, "card"), event);
};

export const subscribeToBoardEvents = (
  workspacePublicId: string,
  handler: BoardHandler,
) => {
  const channel = channelFor(workspacePublicId, "board");
  emitter.on(channel, handler);

  return () => {
    emitter.off(channel, handler);
  };
};

export const subscribeToCardEvents = (
  workspacePublicId: string,
  handler: CardHandler,
) => {
  const channel = channelFor(workspacePublicId, "card");
  emitter.on(channel, handler);

  return () => {
    emitter.off(channel, handler);
  };
};
