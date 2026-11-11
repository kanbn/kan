import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { RateLimitGuard } from "./common/guards/rate-limit.guard.js";
import { createRateLimiter, RATE_LIMITER } from "./common/rate-limiter.js";
import { HealthController } from "./health.controller.js";
import { BoardMemberModule } from "./modules/board-member/board-member.module.js";
import { ChecklistModule } from "./modules/checklist/checklist.module.js";
import { FeedbackModule } from "./modules/feedback/feedback.module.js";
import { LabelModule } from "./modules/label/label.module.js";
import { ListModule } from "./modules/list/list.module.js";
import { McpModule } from "./modules/mcp/mcp.module.js";

@Module({
  imports: [
    BoardMemberModule,
    ChecklistModule,
    FeedbackModule,
    LabelModule,
    ListModule,
    McpModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: RATE_LIMITER, useFactory: createRateLimiter },
  ],
})
export class AppModule {}
