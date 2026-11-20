import { Module } from "@nestjs/common";

import { SessionController } from "./session.controller.js";

@Module({ controllers: [SessionController] })
export class SessionModule {}
