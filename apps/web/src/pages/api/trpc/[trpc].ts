import type { NextApiRequest, NextApiResponse } from "next";
import { createNextApiHandler } from "@trpc/server/adapters/next";

import { appRouter } from "@kan/api/root";
import { createTRPCContext } from "@kan/api/trpc-context";
import { withRateLimit } from "@kan/api/utils/rateLimit";
import { createTRPCRateLimitResponder } from "@kan/api/utils/trpcRateLimit";

import { env } from "~/env";

const nextApiHandler = createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
      : undefined,
});

export default withRateLimit(
  {
    points: 100,
    duration: 60,
    onRateLimit: createTRPCRateLimitResponder(appRouter._def._config),
  },
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const result = await nextApiHandler(req, res);
    return result;
  },
);
