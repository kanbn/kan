import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "../interfaces/request.interface.js";
import { headersFromRaw, resolveUserFromHeaders } from "../session.util.js";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const { user } = await resolveUserFromHeaders(
      headersFromRaw(request.headers),
    );
    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}
