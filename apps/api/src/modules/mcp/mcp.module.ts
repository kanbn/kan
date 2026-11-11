import { Module } from "@nestjs/common";
import { McpTransportType, McpModule as RekogMcpModule } from "@rekog/mcp-nest";

import { AuthGuard } from "../../common/guards/auth.guard.js";
import { BoardMemberModule } from "../board-member/board-member.module.js";
import { ChecklistModule } from "../checklist/checklist.module.js";
import { FeedbackModule } from "../feedback/feedback.module.js";
import { LabelModule } from "../label/label.module.js";
import { ListModule } from "../list/list.module.js";
import { MemberModule } from "../member/member.module.js";
import { BoardMemberTools } from "./tools/board-member.tools.js";
import { ChecklistTools } from "./tools/checklist.tools.js";
import { FeedbackTools } from "./tools/feedback.tools.js";
import { LabelTools } from "./tools/label.tools.js";
import { ListTools } from "./tools/list.tools.js";
import { MemberTools } from "./tools/member.tools.js";

const SERVER_NAME = "kan";

@Module({
  imports: [
    RekogMcpModule.forRoot({
      name: SERVER_NAME,
      version: "0.1.0",
      transport: [McpTransportType.STREAMABLE_HTTP],
      guards: [AuthGuard],
    }),
    BoardMemberModule,
    ChecklistModule,
    FeedbackModule,
    LabelModule,
    ListModule,
    MemberModule,
  ],
  providers: [
    BoardMemberTools,
    ChecklistTools,
    FeedbackTools,
    LabelTools,
    ListTools,
    MemberTools,
  ],
})
export class McpModule {}
