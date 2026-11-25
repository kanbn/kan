import type { OnModuleDestroy } from "@nestjs/common";
import { Req, Sse, UseGuards } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";

import type { BoardEventsRequest } from "./board-events.guard.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { closeBoardStreams, openBoardStream } from "../../common/realtime.js";
import { BoardEventsGuard } from "./board-events.guard.js";

@AuthenticatedController("Boards", "boards")
export class RealtimeController implements OnModuleDestroy {
  // Open streams would otherwise keep the server from closing.
  onModuleDestroy() {
    closeBoardStreams();
  }

  @Sse(":boardPublicId/events")
  @UseGuards(BoardEventsGuard)
  @ApiExcludeEndpoint()
  events(@Req() request: BoardEventsRequest) {
    return openBoardStream(request.user.id, request.boardId);
  }
}
