import type { TRPCLink } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink, loggerLink, splitLink } from "@trpc/client";
import { createWSClient, wsLink } from "@trpc/client/links/wsLink/wsLink";
import { createTRPCNext } from "@trpc/next";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";

import type { AppRouter } from "@kan/api/root";

import { env } from "~/env";

/**
 * This is the client-side entrypoint for your tRPC API. It is used to create the `api` object which
 * contains the Next.js App-wrapper, as well as your type-safe React Query hooks.
 *
 * We also create a few inference helpers for input and output types.
 */

const authLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (typeof window !== "undefined" && err.message === "UNAUTHORIZED") {
            window.location.href = "/login";
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`; // SSR should use vercel url
  const port = env.PORT ? Number(env.PORT) : undefined;
  return `http://localhost:${port ?? 3000}`; // dev SSR should use localhost
};

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      // Queue mutations while offline; React Query auto-replays them when the
      // network comes back.
      networkMode: "offlineFirst",
    },
  },
});

let wsClient: ReturnType<typeof createWSClient> | null = null;
let hasRegisteredBeforeUnload = false;

const resolveWsClient = () => {
  if (typeof window === "undefined") return null;
  if (!env.NEXT_PUBLIC_WEBSOCKET_URL) return null;
  if (wsClient) return wsClient;

  wsClient = createWSClient({
    url: env.NEXT_PUBLIC_WEBSOCKET_URL,
    retryDelayMs(attemptIndex) {
      const capped = Math.min(attemptIndex, 8);
      return Math.pow(2, capped) * 500;
    },
  });

  if (!hasRegisteredBeforeUnload) {
    hasRegisteredBeforeUnload = true;
    window.addEventListener("beforeunload", () => {
      if (wsClient) void wsClient.close();
    });
  }

  return wsClient;
};

// @ts-expect-error - upstream createTRPCNext types require server transformer setup
export const api = createTRPCNext<AppRouter>({
  config() {
    const httpLink = httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    });

    const client = resolveWsClient();

    const links = [
      loggerLink({
        enabled: (opts) =>
          env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      authLink,
      client
        ? splitLink({
            condition: (op) => op.type === "subscription",
            true: wsLink({ client, transformer: superjson }),
            false: httpLink,
          })
        : httpLink,
    ];

    return {
      links,
      queryClient: queryClient,
    };
  },
  ssr: false,
});

export const getWsClient = () => wsClient;

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
