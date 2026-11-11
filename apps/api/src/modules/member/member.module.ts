import { Module } from "@nestjs/common";

import {
  AuthenticatedInviteController,
  InviteController,
  WorkspaceMemberController,
} from "./member.controller.js";
import { MemberService } from "./member.service.js";

@Module({
  controllers: [
    WorkspaceMemberController,
    InviteController,
    AuthenticatedInviteController,
  ],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
