import { Module } from "@nestjs/common";

import { FeedbackController } from "./feedback.controller.js";
import { FeedbackService } from "./feedback.service.js";

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
