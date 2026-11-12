import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ForbiddenException, Injectable } from "@nestjs/common";

import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { isPaidWorkspacePlan } from "@kan/shared/utils";

import type { AuthenticatedRequest } from "../../common/interfaces/request.interface.js";
import { db } from "../../common/session.util.js";

@Injectable()
export class McpPlanGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_KAN_ENV !== "cloud") return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const memberships = await workspaceRepo.getAllByUserId(db, user.id);
    if (memberships.some((m) => isPaidWorkspacePlan(m.workspace.plan)))
      return true;

    throw new ForbiddenException(
      "The hosted MCP server requires a Team, Pro, or Enterprise workspace plan.",
    );
  }
}
