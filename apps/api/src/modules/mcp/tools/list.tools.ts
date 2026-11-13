import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
import { z } from "zod";

import { CreateListSchema, UpdateListSchema } from "../../list/dto/list.dto.js";
import { ListService } from "../../list/list.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { listPublicId } from "./public-ids.js";

const DeleteListSchema = z.object({
  listPublicId,
});

const UpdateListWithIdSchema = UpdateListSchema.extend({
  listPublicId,
});

@UseFilters(McpExceptionFilter)
@McpController()
export class ListTools {
  constructor(private readonly listService: ListService) {}

  @Tool({
    name: "create_list",
    description: "Create a list on a board, on behalf of the current user.",
    parameters: CreateListSchema,
  })
  async createList(
    @Payload() args: z.infer<typeof CreateListSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.listService.create({
      name: args.name,
      boardPublicId: args.boardPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "delete_list",
    description: "Delete a list, on behalf of the current user.",
    parameters: DeleteListSchema,
  })
  async deleteList(
    @Payload() args: z.infer<typeof DeleteListSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.listService.delete({
      listPublicId: args.listPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "update_list",
    description:
      "Update a list's name or position, on behalf of the current user.",
    parameters: UpdateListWithIdSchema,
  })
  async updateList(
    @Payload() args: z.infer<typeof UpdateListWithIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.listService.update({
      listPublicId: args.listPublicId,
      userId: user.id,
      name: args.name,
      index: args.index,
    });
  }
}
