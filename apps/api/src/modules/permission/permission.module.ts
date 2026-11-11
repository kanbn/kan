import { Module } from "@nestjs/common";

import { PermissionController } from "./permission.controller.js";
import { PermissionService } from "./permission.service.js";

@Module({
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
