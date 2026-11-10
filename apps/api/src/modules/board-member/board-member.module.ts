import { Module } from "@nestjs/common";

import { BoardMemberController } from "./board-member.controller.js";
import { BoardMemberService } from "./board-member.service.js";

@Module({
  controllers: [BoardMemberController],
  providers: [BoardMemberService],
  exports: [BoardMemberService],
})
export class BoardMemberModule {}
