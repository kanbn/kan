import { Module } from "@nestjs/common";
import { McpTransportType, McpModule as RekogMcpModule } from "@rekog/mcp-nest";

import { AuthGuard } from "../../common/guards/auth.guard.js";
import { BoardMemberModule } from "../board-member/board-member.module.js";
import { BoardModule } from "../board/board.module.js";
import { ChecklistModule } from "../checklist/checklist.module.js";
import { FeedbackModule } from "../feedback/feedback.module.js";
import { LabelModule } from "../label/label.module.js";
import { ListModule } from "../list/list.module.js";
import { MemberModule } from "../member/member.module.js";
import { PermissionModule } from "../permission/permission.module.js";
import { WebhookModule } from "../webhook/webhook.module.js";
import { WorkspaceModule } from "../workspace/workspace.module.js";
import { BoardMemberTools } from "./tools/board-member.tools.js";
import { BoardTools } from "./tools/board.tools.js";
import { ChecklistTools } from "./tools/checklist.tools.js";
import { FeedbackTools } from "./tools/feedback.tools.js";
import { LabelTools } from "./tools/label.tools.js";
import { ListTools } from "./tools/list.tools.js";
import { MemberTools } from "./tools/member.tools.js";
import { PermissionTools } from "./tools/permission.tools.js";
import { WebhookTools } from "./tools/webhook.tools.js";
import { WorkspaceTools } from "./tools/workspace.tools.js";

const SERVER_NAME = "kan";

@Module({
  imports: [
    RekogMcpModule.forRoot({
      name: SERVER_NAME,
      version: "0.1.0",
      transport: [McpTransportType.STREAMABLE_HTTP],
      guards: [AuthGuard],
    }),
    BoardModule,
    BoardMemberModule,
    ChecklistModule,
    FeedbackModule,
    LabelModule,
    ListModule,
    MemberModule,
    PermissionModule,
    WebhookModule,
    WorkspaceModule,
  ],
  providers: [
    BoardTools,
    BoardMemberTools,
    ChecklistTools,
    FeedbackTools,
    LabelTools,
    ListTools,
    MemberTools,
    PermissionTools,
    WebhookTools,
    WorkspaceTools,
  ],
})
export class McpModule {}
