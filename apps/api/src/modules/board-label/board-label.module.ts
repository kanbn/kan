import { Module } from "@nestjs/common";

import {
  BoardLabelController,
  WorkspaceBoardLabelController,
} from "./board-label.controller.js";
import { BoardLabelService } from "./board-label.service.js";

@Module({
  controllers: [WorkspaceBoardLabelController, BoardLabelController],
  providers: [BoardLabelService],
})
export class BoardLabelModule {}
