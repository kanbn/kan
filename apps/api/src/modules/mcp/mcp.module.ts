import { Module } from "@nestjs/common";
import { McpTransportType, McpModule as RekogMcpModule } from "@rekog/mcp-nest";

import { AuthGuard } from "../../common/guards/auth.guard.js";
import { AttachmentModule } from "../attachment/attachment.module.js";
import { BoardMemberModule } from "../board-member/board-member.module.js";
import { BoardModule } from "../board/board.module.js";
import { CardModule } from "../card/card.module.js";
import { ChecklistModule } from "../checklist/checklist.module.js";
import { FeedbackModule } from "../feedback/feedback.module.js";
import { LabelModule } from "../label/label.module.js";
import { ListModule } from "../list/list.module.js";
import { MemberModule } from "../member/member.module.js";
import { PermissionModule } from "../permission/permission.module.js";
import { UserModule } from "../user/user.module.js";
import { WebhookModule } from "../webhook/webhook.module.js";
import { WorkspaceModule } from "../workspace/workspace.module.js";
import { AttachmentTools } from "./tools/attachment.tools.js";
import { BoardMemberTools } from "./tools/board-member.tools.js";
import { BoardTools } from "./tools/board.tools.js";
import { CardTools } from "./tools/card.tools.js";
import { ChecklistTools } from "./tools/checklist.tools.js";
import { FeedbackTools } from "./tools/feedback.tools.js";
import { LabelTools } from "./tools/label.tools.js";
import { ListTools } from "./tools/list.tools.js";
import { MemberTools } from "./tools/member.tools.js";
import { PermissionTools } from "./tools/permission.tools.js";
import { UserTools } from "./tools/user.tools.js";
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
    AttachmentModule,
    BoardModule,
    BoardMemberModule,
    CardModule,
    ChecklistModule,
    FeedbackModule,
    LabelModule,
    ListModule,
    MemberModule,
    PermissionModule,
    UserModule,
    WebhookModule,
    WorkspaceModule,
  ],
  providers: [
    AttachmentTools,
    BoardTools,
    BoardMemberTools,
    CardTools,
    ChecklistTools,
    FeedbackTools,
    LabelTools,
    ListTools,
    MemberTools,
    PermissionTools,
    UserTools,
    WebhookTools,
    WorkspaceTools,
  ],
})
export class McpModule {}
