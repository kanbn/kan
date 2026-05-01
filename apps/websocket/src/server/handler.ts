import type { Server } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";

import { appRouter } from "@kan/api";

import { createWebsocketContext } from "./context";

interface KeepAliveOptions {
  enabled: boolean;
  pingMs: number;
  pongWaitMs: number;
}

export const createWsHandler = (wss: Server, keepAlive: KeepAliveOptions) => {
  return applyWSSHandler({
    wss,
    router: appRouter,
    createContext: createWebsocketContext,
    keepAlive,
  });
};
