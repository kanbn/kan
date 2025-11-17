import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";
import {
  createCallerFactory,
  createNextApiContext,
  createTRPCContext,
  createWSContext,
} from "./trpc";

const createCaller = createCallerFactory(appRouter);

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export {
  createTRPCContext,
  createWSContext,
  appRouter,
  createCaller,
  createNextApiContext,
};
export type { AppRouter, RouterInputs, RouterOutputs };
