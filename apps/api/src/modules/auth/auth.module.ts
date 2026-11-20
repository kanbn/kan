import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller.js";

@Module({ controllers: [AuthController] })
export class AuthModule {}
