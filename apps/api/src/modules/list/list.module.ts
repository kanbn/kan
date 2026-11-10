import { Module } from "@nestjs/common";

import { ListController } from "./list.controller.js";
import { ListService } from "./list.service.js";

@Module({
  controllers: [ListController],
  providers: [ListService],
})
export class ListModule {}
