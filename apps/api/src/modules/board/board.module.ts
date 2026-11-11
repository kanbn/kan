import { Module } from "@nestjs/common";

import {
  BoardController,
  PublicBoardController,
  WorkspaceBoardController,
} from "./board.controller.js";
import { BoardService } from "./board.service.js";

@Module({
  controllers: [
    WorkspaceBoardController,
    BoardController,
    PublicBoardController,
  ],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
