import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";
import { createCallerFactory } from "./trpc";
import { createNextApiContext, createTRPCContext } from "./trpc-context";

const createCaller = createCallerFactory(appRouter);

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { createTRPCContext, appRouter, createCaller, createNextApiContext };
export type { AppRouter, RouterInputs, RouterOutputs };
