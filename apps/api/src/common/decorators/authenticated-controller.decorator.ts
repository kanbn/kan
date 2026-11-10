import { applyDecorators, Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../guards/auth.guard.js";

export function AuthenticatedController(tag: string, path: string) {
  return applyDecorators(
    ApiTags(tag),
    ApiBearerAuth("bearer"),
    Controller(path),
    UseGuards(AuthGuard),
  );
}
