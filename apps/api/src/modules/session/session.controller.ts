import type { Request, Response } from "express";
import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { repairSessionCookies } from "@kan/auth/server";
import { createLogger } from "@kan/logger";

import {
  auth,
  headersFromRaw,
  resolveUserFromHeaders,
} from "../../common/session.util.js";

const log = createLogger("session-reset");

// Set when a repair is attempted, so a second 401 signs the user out instead
// of repairing again.
const REPAIR_MARKER = "kan_session_repair";

// Resolve against a dummy origin so anything the URL parser would send
// off-site (//host, /\host, tabs or newlines) is rejected.
const safeNext = (value: unknown) => {
  if (typeof value !== "string") return "/boards";
  const url = new URL(value, "https://kan.invalid");
  return url.origin === "https://kan.invalid" && value.startsWith("/")
    ? `${url.pathname}${url.search}${url.hash}`
    : "/boards";
};

// The API client lands here on a 401. A session that works on the web host but
// not on the API gets its cookies moved to the shared domain; anything else is
// signed out, so the login page can't send the user back into a loop.
@ApiExcludeController()
@Controller("session")
export class SessionController {
  @Get("reset")
  async reset(
    @Req() req: Request,
    @Res() res: Response,
    @Query("next") next: unknown,
  ) {
    const { user } = await resolveUserFromHeaders(headersFromRaw(req.headers));
    const { healed, headers } = repairSessionCookies({
      options: auth.options,
      cookieHeader: req.headers.cookie,
      hasSession: !!user,
      alreadyRepaired: !!req.headers.cookie
        ?.split(";")
        .some((c) => c.trim().startsWith(`${REPAIR_MARKER}=`)),
    });

    log.info({ healed, userId: user?.id }, "Session reset");

    res.setHeader("Set-Cookie", [
      ...headers,
      healed
        ? `${REPAIR_MARKER}=1; Path=/; Max-Age=60; HttpOnly; SameSite=Lax`
        : `${REPAIR_MARKER}=; Path=/; Max-Age=0`,
    ]);
    res.redirect(302, healed ? safeNext(next) : "/login");
  }
}
