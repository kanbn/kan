import type { IncomingHttpHeaders } from "http";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";

import type { User } from "./interfaces/user.interface.js";

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

export async function resolveUserFromHeaders(
  headers: Headers,
): Promise<{ user: User | null }> {
  const session = await auth.api.getSession({ headers });
  return { user: (session?.user as User | undefined) ?? null };
}
