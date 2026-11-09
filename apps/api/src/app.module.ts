import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller.js";
import { FeedbackModule } from "./modules/feedback/feedback.module.js";

@Module({
  imports: [FeedbackModule],
  controllers: [HealthController],
})
export class AppModule {}
