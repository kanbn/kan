import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { RateLimitGuard } from "./common/guards/rate-limit.guard.js";
import { createRateLimiter, RATE_LIMITER } from "./common/rate-limiter.js";
import { HealthController } from "./health.controller.js";
import { BoardMemberModule } from "./modules/board-member/board-member.module.js";
import { ChecklistModule } from "./modules/checklist/checklist.module.js";
import { FeedbackModule } from "./modules/feedback/feedback.module.js";
import { ImportModule } from "./modules/import/import.module.js";
import { IntegrationModule } from "./modules/integration/integration.module.js";
import { LabelModule } from "./modules/label/label.module.js";
import { ListModule } from "./modules/list/list.module.js";
import { McpModule } from "./modules/mcp/mcp.module.js";
import { MemberModule } from "./modules/member/member.module.js";
import { PermissionModule } from "./modules/permission/permission.module.js";
import { WebhookModule } from "./modules/webhook/webhook.module.js";
import { WorkspaceModule } from "./modules/workspace/workspace.module.js";

@Module({
  imports: [
    BoardMemberModule,
    ChecklistModule,
    FeedbackModule,
    ImportModule,
    IntegrationModule,
    LabelModule,
    ListModule,
    McpModule,
    MemberModule,
    PermissionModule,
    WebhookModule,
    WorkspaceModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: RATE_LIMITER, useFactory: createRateLimiter },
  ],
})
export class AppModule {}
