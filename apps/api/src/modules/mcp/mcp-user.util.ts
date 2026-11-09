import { UnauthorizedException } from "@nestjs/common";

import type { User } from "../../common/interfaces/user.interface.js";

export function requireMcpUser(rawRequest: { user?: unknown } | undefined) {
  if (!rawRequest?.user) {
    throw new UnauthorizedException(
      "MCP request is missing an authenticated user",
    );
  }

  return rawRequest.user as User;
}
