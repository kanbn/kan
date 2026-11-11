import { Module } from "@nestjs/common";

import {
  CardChecklistController,
  ChecklistController,
} from "./checklist.controller.js";
import { ChecklistService } from "./checklist.service.js";

@Module({
  controllers: [ChecklistController, CardChecklistController],
  providers: [ChecklistService],
  exports: [ChecklistService],
})
export class ChecklistModule {}
