import type { CanActivate, ExecutionContext } from "@nestjs/common";
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import * as boardRepo from "@kan/db/repository/board.repo";
import {
  assertBoardAccess,
  assertPermission,
} from "@kan/server/utils/permissions";

import type { AuthenticatedRequest } from "../../common/interfaces/request.interface.js";
import { hasMaxStreams } from "../../common/realtime.js";
import { db } from "../../common/session.util.js";

export type BoardEventsRequest = AuthenticatedRequest & { boardId: number };

// A guard, as Nest has already answered 200 by the time an @Sse() handler that
// awaits something throws.
@Injectable()
export class BoardEventsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Tells browsers not to reconnect.
    if (process.env.DISABLE_REALTIME_UPDATES === "true")
      throw new HttpException("", HttpStatus.NO_CONTENT);

    const request = context.switchToHttp().getRequest<BoardEventsRequest>();
    const boardPublicId = String(request.params.boardPublicId);
    const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
      db,
      boardPublicId,
    );

    if (!board)
      throw new NotFoundException(
        `Board with public ID ${boardPublicId} not found`,
      );

    const { user } = request;
    await assertPermission(db, user.id, board.workspaceId, "board:view");
    await assertBoardAccess(db, user.id, board);

    if (hasMaxStreams(user.id))
      throw new HttpException(
        "Too many open boards",
        HttpStatus.TOO_MANY_REQUESTS,
      );

    request.boardId = board.id;
    return true;
  }
}
