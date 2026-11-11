import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { ChecklistService } from "../../checklist/checklist.service.js";
import {
  CreateChecklistItemSchema,
  CreateChecklistSchema,
  UpdateChecklistItemSchema,
  UpdateChecklistSchema,
} from "../../checklist/dto/checklist.dto.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { Tool } from "../tool.decorator.js";

const CreateChecklistWithCardSchema = CreateChecklistSchema.extend({
  cardPublicId: z.string().min(12),
});

const UpdateChecklistWithIdSchema = UpdateChecklistSchema.extend({
  checklistPublicId: z.string().min(12),
});

const DeleteChecklistSchema = z.object({
  checklistPublicId: z.string().min(12),
});

const CreateChecklistItemWithChecklistSchema = CreateChecklistItemSchema.extend(
  {
    checklistPublicId: z.string().min(12),
  },
);

const UpdateChecklistItemWithIdSchema = UpdateChecklistItemSchema.extend({
  checklistItemPublicId: z.string().min(12),
});

const DeleteChecklistItemSchema = z.object({
  checklistItemPublicId: z.string().min(12),
});

@Injectable()
export class ChecklistTools {
  constructor(private readonly checklistService: ChecklistService) {}

  @Tool({
    name: "create_checklist",
    params: {
      name: "Checklist name.",
    },
    description: "Add a checklist to a card, on behalf of the current user.",
    parameters: CreateChecklistWithCardSchema,
  })
  async createChecklist(
    args: z.infer<typeof CreateChecklistWithCardSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    params: {
      name: "New checklist name.",
    },
    description: "Update a checklist's name, on behalf of the current user.",
    parameters: UpdateChecklistWithIdSchema,
  })
  async updateChecklist(
    args: z.infer<typeof UpdateChecklistWithIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof DeleteChecklistSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.delete({
      checklistPublicId: args.checklistPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "create_checklist_item",
    params: {
      title: "Checklist item text.",
    },
    description: "Add an item to a checklist, on behalf of the current user.",
    parameters: CreateChecklistItemWithChecklistSchema,
  })
  async createChecklistItem(
    args: z.infer<typeof CreateChecklistItemWithChecklistSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    params: {
      title: "New checklist item text.",
      index: "Zero-based position within the checklist.",
    },
    description:
      "Update a checklist item's title, completed state, or position, on behalf of the current user.",
    parameters: UpdateChecklistItemWithIdSchema,
  })
  async updateChecklistItem(
    args: z.infer<typeof UpdateChecklistItemWithIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof DeleteChecklistItemSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.checklistService.deleteItem({
      checklistItemPublicId: args.checklistItemPublicId,
      userId: user.id,
    });
  }
}
