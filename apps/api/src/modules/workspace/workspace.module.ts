import { Module } from "@nestjs/common";

import { WorkspaceController } from "./workspace.controller.js";
import { WorkspaceService } from "./workspace.service.js";

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
