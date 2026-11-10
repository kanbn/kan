import { Module } from "@nestjs/common";
import { McpTransportType, McpModule as RekogMcpModule } from "@rekog/mcp-nest";

import { AuthGuard } from "../../common/guards/auth.guard.js";
import { FeedbackModule } from "../feedback/feedback.module.js";
import { LabelModule } from "../label/label.module.js";
import { ListModule } from "../list/list.module.js";
import { FeedbackTools } from "./tools/feedback.tools.js";
import { LabelTools } from "./tools/label.tools.js";
import { ListTools } from "./tools/list.tools.js";

const SERVER_NAME = "kan";

@Module({
  imports: [
    RekogMcpModule.forRoot({
      name: SERVER_NAME,
      version: "0.1.0",
      transport: [McpTransportType.STREAMABLE_HTTP],
      guards: [AuthGuard],
    }),
    FeedbackModule,
    LabelModule,
    ListModule,
  ],
  providers: [FeedbackTools, LabelTools, ListTools],
})
export class McpModule {}
