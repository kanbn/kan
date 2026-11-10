import { z } from "zod";
import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";

import { CreateListSchema, UpdateListSchema } from "../../list/dto/list.dto.js";
import { ListService } from "../../list/list.service.js";
import { requireMcpUser } from "../mcp-user.util.js";

const DeleteListSchema = z.object({
  listPublicId: z.string().min(12),
});

const UpdateListWithIdSchema = UpdateListSchema.extend({
  listPublicId: z.string().min(12),
});

@Injectable()
export class ListTools {
  constructor(private readonly listService: ListService) {}

  @Tool({
    name: "create_list",
    description: "Create a list on a board, on behalf of the current user.",
    parameters: CreateListSchema,
  })
  async createList(
    args: z.infer<typeof CreateListSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof DeleteListSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof UpdateListWithIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
