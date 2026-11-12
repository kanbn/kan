import type { NextApiRequest, NextApiResponse } from "next";

import { repairSessionCookies } from "@kan/auth/server";
import { createLogger } from "@kan/logger";
import { auth, createNextApiContext } from "@kan/server/context";

const log = createLogger("session-reset");

// Set when a repair is attempted, so a second 401 signs the user out instead
// of repairing again.
const REPAIR_MARKER = "kan_session_repair";

const safeNext = (value: unknown) =>
  typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/boards";

// The API client lands here on a 401. A session that works on the web host but
// not on the API gets its cookies moved to the shared domain; anything else is
// signed out, so the login page can't send the user back into a loop.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { user } = await createNextApiContext(req);
  const { healed, headers } = repairSessionCookies({
    options: auth.options,
    cookieHeader: req.headers.cookie,
    hasSession: !!user,
    alreadyRepaired: !!req.cookies[REPAIR_MARKER],
  });

  log.info({ healed, userId: user?.id }, "Session reset");

  res.setHeader("Set-Cookie", [
    ...headers,
    healed
      ? `${REPAIR_MARKER}=1; Path=/; Max-Age=60; HttpOnly; SameSite=Lax`
      : `${REPAIR_MARKER}=; Path=/; Max-Age=0`,
  ]);
  res.redirect(302, healed ? safeNext(req.query.next) : "/login");
}
