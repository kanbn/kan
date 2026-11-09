import { Module } from "@nestjs/common";
import { McpTransportType, McpModule as RekogMcpModule } from "@rekog/mcp-nest";

import { AuthGuard } from "../../common/guards/auth.guard.js";
import { FeedbackModule } from "../feedback/feedback.module.js";
import { FeedbackTools } from "./tools/feedback.tools.js";

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
  ],
  providers: [FeedbackTools],
})
export class McpModule {}
