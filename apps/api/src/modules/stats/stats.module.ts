import { Module } from "@nestjs/common";

import { StatsController } from "./stats.controller.js";

@Module({ controllers: [StatsController] })
export class StatsModule {}
