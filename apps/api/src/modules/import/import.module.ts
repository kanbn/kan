import { Module } from "@nestjs/common";

import {
  ImportController,
  ImportSourceController,
} from "./import.controller.js";
import { ImportService } from "./import.service.js";

@Module({
  controllers: [ImportSourceController, ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
