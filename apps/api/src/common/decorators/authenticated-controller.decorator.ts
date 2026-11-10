import { applyDecorators, Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../guards/auth.guard.js";

// Bundles the class-level decorators every authenticated REST controller
// repeats: Swagger grouping/auth metadata, the route prefix, and the guard.
export function AuthenticatedController(tag: string, path: string) {
  return applyDecorators(
    ApiTags(tag),
    ApiBearerAuth("bearer"),
    Controller(path),
    UseGuards(AuthGuard),
  );
}
