import type { LoggerService } from "@nestjs/common";

import { createLogger } from "@kan/logger";

const log = createLogger("nest");

// Nest calls these as (message, ...params) with the context last and, for
// error(), the stack before it.
const split = (params: unknown[]) => {
  const context =
    params.length > 0 && typeof params[params.length - 1] === "string"
      ? (params[params.length - 1] as string)
      : undefined;
  const rest = context === undefined ? params : params.slice(0, -1);
  return { context, rest };
};

// Per-module and per-route startup lines: debug, not one info line each per deploy.
const BOOTSTRAP_CONTEXTS = new Set([
  "InstanceLoader",
  "RoutesResolver",
  "RouterExplorer",
]);

/** Routes Nest's own logs (startup, unhandled exceptions) through pino. */
export class NestPinoLogger implements LoggerService {
  log(message: unknown, ...params: unknown[]) {
    const { context } = split(params);
    const level = context && BOOTSTRAP_CONTEXTS.has(context) ? "debug" : "info";
    log[level]({ context }, String(message));
  }

  error(message: unknown, ...params: unknown[]) {
    const { context, rest } = split(params);
    const stack = typeof rest[0] === "string" ? rest[0] : undefined;
    if (message instanceof Error)
      log.error({ context, err: message }, message.message);
    else log.error({ context, ...(stack && { stack }) }, String(message));
  }

  warn(message: unknown, ...params: unknown[]) {
    log.warn({ context: split(params).context }, String(message));
  }

  debug(message: unknown, ...params: unknown[]) {
    log.debug({ context: split(params).context }, String(message));
  }

  verbose(message: unknown, ...params: unknown[]) {
    log.trace({ context: split(params).context }, String(message));
  }

  fatal(message: unknown, ...params: unknown[]) {
    log.fatal({ context: split(params).context }, String(message));
  }
}
