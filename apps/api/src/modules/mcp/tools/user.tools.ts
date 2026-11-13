import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
import { z } from "zod";

import { UpdateUserSchema } from "../../user/dto/user.dto.js";
import { UserService } from "../../user/user.service.js";
import { requireMcpUser } from "../mcp-user.util.js";

@UseFilters(McpExceptionFilter)
@McpController()
export class UserTools {
  constructor(private readonly userService: UserService) {}

  @Tool({
    name: "get_current_user",
    description: "Get the profile of the current user.",
    parameters: z.object({}),
  })
  async getCurrentUser(
    @Payload() _args: Record<string, never>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.userService.getUser({ userId: user.id });
  }

  @Tool({
    name: "update_current_user",
    description: "Update the current user's display name or avatar.",
    parameters: UpdateUserSchema,
  })
  async updateCurrentUser(
    @Payload() args: z.infer<typeof UpdateUserSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.userService.update({ userId: user.id, ...args });
  }
}
