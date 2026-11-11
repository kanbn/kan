import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { IncomingHttpHeaders } from "http";
import { Injectable } from "@nestjs/common";

import type { User } from "../interfaces/user.interface.js";
import { headersFromRaw, resolveUserFromHeaders } from "../session.util.js";

// Attaches the user when the request carries a valid session or API key, and
// lets anonymous requests through; the handler decides what they may see.
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: IncomingHttpHeaders; user?: User }>();

    const { user } = await resolveUserFromHeaders(
      headersFromRaw(request.headers),
    );
    if (user) request.user = user;

    return true;
  }
}
