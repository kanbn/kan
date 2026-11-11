import { randomUUID } from "crypto";
import type { NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { HttpException, Injectable } from "@nestjs/common";

import { redactSensitive } from "@kan/api/utils/redact";
import { createLogger } from "@kan/logger";

import type { User } from "../interfaces/user.interface.js";

const log = createLogger("api");

const isCloud = () => process.env.NEXT_PUBLIC_KAN_ENV === "cloud";

// Polled by container health checks every few seconds.
const SKIPPED_PATHS = new Set(["/health"]);

const nonEmpty = (value: unknown) =>
  !!value && typeof value === "object" && Object.keys(value).length > 0;

// One line per request, in the shape the tRPC logging middleware used
// (requestId, procedure, transport, duration, userId, input, status), so
// existing Axiom queries keep working.
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request & { user?: User }, res: Response, next: NextFunction) {
    // Nest mounts middleware so req.path is relative; use the full URL path.
    const path = req.originalUrl.split("?")[0] ?? "/";
    if (SKIPPED_PATHS.has(path)) return next();

    const start = Date.now();
    const requestId = req.header("x-request-id") ?? randomUUID();
    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const route = (req.route as { path?: string } | undefined)?.path;
      const error: unknown = res.locals.error;
      const status = res.statusCode;
      const meta = {
        requestId,
        procedure: `${req.method} ${route ? `${req.baseUrl}${route}` : path}`,
        transport: "rest",
        duration: Date.now() - start,
        userId: req.user?.id,
        ...(isCloud() && req.user?.email && { email: req.user.email }),
        ...((nonEmpty(req.query) || nonEmpty(req.body)) && {
          input: {
            ...(nonEmpty(req.query) && { query: redactSensitive(req.query) }),
            ...(nonEmpty(req.body) && { body: redactSensitive(req.body) }),
          },
        }),
        status,
        ...(error instanceof Error &&
          (status >= 500 || !(error instanceof HttpException)
            ? { err: error }
            : { error: error.message })),
      };

      if (status >= 400) log.error(meta, "REST error");
      else log.info(meta, "REST OK");
    });

    next();
  }
}
