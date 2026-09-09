import { randomUUID } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { createLogger } from "@kan/logger";

import { createNextApiContext } from "../trpc-context";

const log = createLogger("api");

const isCloud = process.env.NEXT_PUBLIC_KAN_ENV === "cloud";

export function withApiLogging(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
  ) => Promise<unknown> | unknown,
  options?: { transport?: string },
) {
  const transport = options?.transport ?? "rest";
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now();
    const requestId = randomUUID();
    const route = req.url?.split("?")[0] ?? "unknown";
    const input = {
      ...(req.query &&
        Object.keys(req.query).length > 0 && { query: req.query }),
      ...(req.body &&
        typeof req.body === "object" &&
        Object.keys(req.body).length > 0 && { body: req.body }),
    };

    let userId: string | undefined;
    let email: string | undefined;
    try {
      const ctx = await createNextApiContext(req);
      userId = ctx.user?.id;
      email = ctx.user?.email ?? undefined;
    } catch {
      // unauthenticated or auth unavailable
    }

    let handlerError: unknown;
    try {
      await handler(req, res);
    } catch (err) {
      handlerError = err;
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }

    const statusCode = res.statusCode || (handlerError ? 500 : 200);

    const duration = Date.now() - start;
    const meta = {
      requestId,
      procedure: route,
      transport,
      duration,
      userId,
      ...(isCloud && email && { email }),
      ...(Object.keys(input).length > 0 && { input }),
      status: statusCode,
      ...(handlerError instanceof Error && {
        error: handlerError.message,
        stack: handlerError.stack,
      }),
    };

    if (statusCode >= 400 || handlerError) {
      log.error(meta, "API error");
    } else {
      log.info(meta, "API OK");
    }
  };
}
