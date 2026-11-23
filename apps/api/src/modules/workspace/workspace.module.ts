import { Module } from "@nestjs/common";

import {
  PublicWorkspaceController,
  WorkspaceController,
} from "./workspace.controller.js";
import { WorkspaceService } from "./workspace.service.js";

@Module({
  controllers: [WorkspaceController, PublicWorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
