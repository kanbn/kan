import type { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";

import { createWSContext } from "@kan/api";

export const createWebsocketContext = async (
  opts: CreateWSSContextFnOptions,
) => {
  return createWSContext(opts);
};

export type WebsocketContext = Awaited<
  ReturnType<typeof createWebsocketContext>
>;
