import { Module } from "@nestjs/common";

import {
  AttachmentController,
  CardAttachmentController,
} from "./attachment.controller.js";
import { AttachmentService } from "./attachment.service.js";

@Module({
  controllers: [CardAttachmentController, AttachmentController],
  providers: [AttachmentService],
  exports: [AttachmentService],
})
export class AttachmentModule {}
