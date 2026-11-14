import type { IncomingHttpHeaders } from "http";
import { HttpException, HttpStatus } from "@nestjs/common";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";
import { createLogger } from "@kan/logger";

import type { User } from "./interfaces/user.interface.js";

const log = createLogger("auth");

export const db = createDrizzleClient();
const auth = initAuth(db);

export function headersFromRaw(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (!value) continue;
    for (const v of Array.isArray(value) ? value : [value])
      headers.append(key, v);
  }
  return headers;
}

const isRateLimitedApiKeyError = (
  error: unknown,
): error is { body: { details?: { tryAgainIn?: number } } } =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "APIError" &&
  (error as { body?: { code?: unknown } }).body?.code === "RATE_LIMITED";

// An invalid or revoked API key makes better-auth throw; treat that as signed
// out (401 from AuthGuard) rather than letting its 403 through. A key over
// its rate limit is a 429.
export async function resolveUserFromHeaders(
  headers: Headers,
): Promise<{ user: User | null }> {
  try {
    const session = await auth.api.getSession({ headers });
    return { user: session?.user ?? null };
  } catch (error) {
    if (isRateLimitedApiKeyError(error)) {
      const tryAgainIn = error.body.details?.tryAgainIn;
      throw new HttpException(
        "Rate limit exceeded for this API key." +
          (tryAgainIn ? ` Try again in ${Math.ceil(tryAgainIn / 1000)}s.` : ""),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    log.warn(
      { err: error },
      "Failed to get session, treating as unauthenticated",
    );
    return { user: null };
  }
}

export function sendMagicLinkInvite(
  headers: Headers,
  input: { email: string; callbackURL: string },
) {
  return auth.api.signInMagicLink({
    headers,
    body: { email: input.email, callbackURL: input.callbackURL },
  });
}

export function setUserPassword(headers: Headers, newPassword: string) {
  return auth.api.setPassword({ headers, body: { newPassword } });
}
