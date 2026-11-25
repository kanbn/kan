import { Module } from "@nestjs/common";

import { RealtimeController } from "./realtime.controller.js";

@Module({ controllers: [RealtimeController] })
export class RealtimeModule {}
