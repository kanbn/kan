import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
import { z } from "zod";

import { ChecklistService } from "../../checklist/checklist.service.js";
import {
  CreateChecklistItemSchema,
  CreateChecklistSchema,
  UpdateChecklistItemSchema,
  UpdateChecklistSchema,
} from "../../checklist/dto/checklist.dto.js";
import { requireMcpUser } from "../mcp-user.util.js";
import {
  cardPublicId,
  checklistItemPublicId,
  checklistPublicId,
} from "./public-ids.js";

const CreateChecklistWithCardSchema = CreateChecklistSchema.extend({
  cardPublicId,
});

const UpdateChecklistWithIdSchema = UpdateChecklistSchema.extend({
  checklistPublicId,
});

const DeleteChecklistSchema = z.object({
  checklistPublicId,
});

const CreateChecklistItemWithChecklistSchema = CreateChecklistItemSchema.extend(
  {
    checklistPublicId,
  },
);

const UpdateChecklistItemWithIdSchema = UpdateChecklistItemSchema.extend({
  checklistItemPublicId,
});

const DeleteChecklistItemSchema = z.object({
  checklistItemPublicId,
});

@UseFilters(McpExceptionFilter)
@McpController()
export class ChecklistTools {
  constructor(private readonly checklistService: ChecklistService) {}

  @Tool({
    name: "create_checklist",
    description: "Add a checklist to a card, on behalf of the current user.",
    parameters: CreateChecklistWithCardSchema,
  })
  async createChecklist(
    @Payload() args: z.infer<typeof CreateChecklistWithCardSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.create({
      cardPublicId: args.cardPublicId,
      name: args.name,
      userId: user.id,
    });
  }

  @Tool({
    name: "update_checklist",
    description: "Update a checklist's name, on behalf of the current user.",
    parameters: UpdateChecklistWithIdSchema,
  })
  async updateChecklist(
    @Payload() args: z.infer<typeof UpdateChecklistWithIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.update({
      checklistPublicId: args.checklistPublicId,
      name: args.name,
      userId: user.id,
    });
  }

  @Tool({
    name: "delete_checklist",
    description: "Delete a checklist, on behalf of the current user.",
    parameters: DeleteChecklistSchema,
  })
  async deleteChecklist(
    @Payload() args: z.infer<typeof DeleteChecklistSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.delete({
      checklistPublicId: args.checklistPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "create_checklist_item",
    description: "Add an item to a checklist, on behalf of the current user.",
    parameters: CreateChecklistItemWithChecklistSchema,
  })
  async createChecklistItem(
    @Payload() args: z.infer<typeof CreateChecklistItemWithChecklistSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.createItem({
      checklistPublicId: args.checklistPublicId,
      title: args.title,
      userId: user.id,
    });
  }

  @Tool({
    name: "update_checklist_item",
    description:
      "Update a checklist item's title, completed state, or position, on behalf of the current user.",
    parameters: UpdateChecklistItemWithIdSchema,
  })
  async updateChecklistItem(
    @Payload() args: z.infer<typeof UpdateChecklistItemWithIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.updateItem({
      checklistItemPublicId: args.checklistItemPublicId,
      userId: user.id,
      title: args.title,
      completed: args.completed,
      index: args.index,
    });
  }

  @Tool({
    name: "delete_checklist_item",
    description: "Delete a checklist item, on behalf of the current user.",
    parameters: DeleteChecklistItemSchema,
  })
  async deleteChecklistItem(
    @Payload() args: z.infer<typeof DeleteChecklistItemSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.deleteItem({
      checklistItemPublicId: args.checklistItemPublicId,
      userId: user.id,
    });
  }
}
