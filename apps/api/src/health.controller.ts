import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { sql } from "drizzle-orm";

import { SkipRateLimit } from "./common/decorators/skip-rate-limit.decorator.js";
import { db } from "./common/session.util.js";

// Infra liveness probe for the api service itself — not kan's business
// "health"/"stats" router (still served from apps/web, not yet ported).
@ApiExcludeController()
@SkipRateLimit()
@Controller("health")
export class HealthController {
  @Get()
  async health() {
    try {
      await db.execute(sql`select 1`);
      return { status: "ok" as const };
    } catch {
      throw new ServiceUnavailableException({ status: "error" });
    }
  }
}
