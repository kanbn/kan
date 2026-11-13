import { Controller, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { McpHttpControllerFor } from "@rekog/mcp-nest";

import { AuthGuard } from "../../common/guards/auth.guard.js";
import { McpPlanGuard } from "./mcp-plan.guard.js";
import { mcpTransport } from "./mcp.strategy.js";

@ApiExcludeController()
@Controller("mcp")
@UseGuards(AuthGuard, McpPlanGuard)
export class McpHttpController extends McpHttpControllerFor(mcpTransport) {}
