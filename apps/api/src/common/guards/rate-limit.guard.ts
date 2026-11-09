import { createHash } from "crypto";
import type { RateLimiterAbstract } from "rate-limiter-flexible";
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../interfaces/request.interface.js";
import { SKIP_RATE_LIMIT } from "../decorators/skip-rate-limit.decorator.js";
import { RATE_LIMITER } from "../rate-limiter.js";

const ERROR_MESSAGE = "Too many requests, please try again later.";

// Duplicated from @kan/auth's getApiKeyFromHeaders / @kan/api's getApiToken
// (not part of either package's public export map) — same 6-line extraction
// kan already has twice, a third copy isn't worth a shared export for.
function getApiToken(headers: AuthenticatedRequest["headers"]): string | null {
  const authorization = headers.authorization;
  const bearerMatch =
    typeof authorization === "string"
      ? /^Bearer (.+)$/i.exec(authorization)
      : null;
  if (bearerMatch) return bearerMatch[1] ?? null;
  const apiKeyHeader = headers["x-api-key"];
  return typeof apiKeyHeader === "string" ? apiKeyHeader : null;
}

function getIp(request: AuthenticatedRequest): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  const realIp = request.headers["x-real-ip"];
  const cfConnectingIp = request.headers["cf-connecting-ip"];
  return (
    (typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : null) ??
    (typeof realIp === "string" ? realIp : null) ??
    (typeof cfConnectingIp === "string" ? cfConnectingIp : null) ??
    request.socket.remoteAddress ??
    "unknown"
  );
}

function identify(request: AuthenticatedRequest): string {
  const token = getApiToken(request.headers);
  if (token) {
    return `token_${createHash("sha256").update(token).digest("hex")}`;
  }
  return getIp(request);
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiterAbstract,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.DISABLE_RATE_LIMIT === "true") return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    try {
      await this.limiter.consume(identify(request));
      return true;
    } catch (error) {
      const isLimitExceeded =
        error != null &&
        typeof error === "object" &&
        ("msBeforeNext" in error || "remainingPoints" in error);
      if (isLimitExceeded) {
        throw new HttpException(ERROR_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
      }
      // Limiter backend error (e.g. a Redis hiccup) — fail open, matching
      // kan's existing rate limiter's behavior on non-limit errors.
      return true;
    }
  }
}
