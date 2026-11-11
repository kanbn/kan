import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { UpdateUserSchema } from "../../user/dto/user.dto.js";
import { UserService } from "../../user/user.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { Tool } from "../tool.decorator.js";

@Injectable()
export class UserTools {
  constructor(private readonly userService: UserService) {}

  @Tool({
    name: "get_current_user",
    description: "Get the profile of the current user.",
    parameters: z.object({}),
  })
  async getCurrentUser(
    _args: Record<string, never>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.userService.getUser({ userId: user.id });
  }

  @Tool({
    name: "update_current_user",
    params: {
      name: "New display name.",
    },
    description: "Update the current user's display name or avatar.",
    parameters: UpdateUserSchema,
  })
  async updateCurrentUser(
    args: z.infer<typeof UpdateUserSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.userService.update({ userId: user.id, ...args });
  }
}
