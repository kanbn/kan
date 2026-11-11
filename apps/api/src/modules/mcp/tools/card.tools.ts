import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { CardService } from "../../card/card.service.js";
import {
  ActivitiesQuerySchema,
  CommentSchema,
  CreateCardSchema,
  DuplicateCardSchema,
  UpdateCardSchema,
} from "../../card/dto/card.dto.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { Tool } from "../tool.decorator.js";

const CardIdSchema = z.object({ cardPublicId: z.string().min(12) });
const CreateCardWithDefaultsSchema = CreateCardSchema.extend({
  description: CreateCardSchema.shape.description.default(""),
  labelPublicIds: CreateCardSchema.shape.labelPublicIds.default([]),
  memberPublicIds: CreateCardSchema.shape.memberPublicIds.default([]),
  position: CreateCardSchema.shape.position.default("end"),
});
const UpdateCardWithIdSchema = UpdateCardSchema.extend(CardIdSchema.shape);
const DuplicateCardWithIdSchema = DuplicateCardSchema.extend(
  CardIdSchema.shape,
);
const ActivitiesWithIdSchema = ActivitiesQuerySchema.extend(CardIdSchema.shape);
const AddCommentSchema = CommentSchema.extend(CardIdSchema.shape);
const CommentIdSchema = CardIdSchema.extend({
  commentPublicId: z.string().min(12),
});
const UpdateCommentSchema = CommentIdSchema.extend(CommentSchema.shape);
const ToggleLabelSchema = CardIdSchema.extend({
  labelPublicId: z.string().min(12),
});
const ToggleMemberSchema = CardIdSchema.extend({
  workspaceMemberPublicId: z.string().min(12),
});

type McpRequest = { user?: unknown } | undefined;

@Injectable()
export class CardTools {
  constructor(private readonly cardService: CardService) {}

  @Tool({
    name: "get_card",
    description:
      "Get a card with its labels, members, checklists, attachments and recent activity.",
    parameters: CardIdSchema,
  })
  async getCard(
    args: z.infer<typeof CardIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.byId({ ...args, userId: user.id });
  }

  @Tool({
    name: "get_card_activities",
    description: "Get a card's activity history, paginated.",
    parameters: ActivitiesWithIdSchema,
  })
  async getCardActivities(
    args: z.infer<typeof ActivitiesWithIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.getActivities({ ...args, userId: user.id });
  }

  @Tool({
    name: "create_card",
    params: {
      title: "Card title.",
      description: "Card description, in markdown.",
      dueDate: "Due date in ISO 8601, e.g. 2026-12-31T17:00:00Z.",
    },
    description:
      "Create a card in a list, optionally with labels, members and a due date (ISO 8601).",
    parameters: CreateCardWithDefaultsSchema,
  })
  async createCard(
    args: z.infer<typeof CreateCardWithDefaultsSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.create({
      ...args,
      userId: user.id,
      userName: user.name,
    });
  }

  @Tool({
    name: "update_card",
    params: {
      title: "New card title.",
      description: "New card description, in markdown.",
      listPublicId:
        "Move the card to this list. Get its public ID from get_board.",
      index:
        "Zero-based position in the card's list (or in listPublicId when moving); 0 is the top.",
    },
    description:
      "Update a card's title, description or due date, or move it (listPublicId and/or index).",
    parameters: UpdateCardWithIdSchema,
  })
  async updateCard(
    args: z.infer<typeof UpdateCardWithIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.update({
      ...args,
      userId: user.id,
      userName: user.name,
    });
  }

  @Tool({
    name: "delete_card",
    description: "Delete (archive) a card.",
    parameters: CardIdSchema,
  })
  async deleteCard(
    args: z.infer<typeof CardIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.delete({
      ...args,
      userId: user.id,
      userName: user.name,
    });
  }

  @Tool({
    name: "duplicate_card",
    params: {
      title: "Title for the duplicate. Defaults to the original title.",
      listPublicId:
        "The list to put the duplicate in. Get its public ID from get_board.",
      index: "Zero-based position in the target list. Defaults to the end.",
    },
    description:
      "Duplicate a card into a list, optionally copying labels, members and checklists.",
    parameters: DuplicateCardWithIdSchema,
  })
  async duplicateCard(
    args: z.infer<typeof DuplicateCardWithIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.duplicate({ ...args, userId: user.id });
  }

  @Tool({
    name: "toggle_card_label",
    description: "Add a label to a card, or remove it if already applied.",
    parameters: ToggleLabelSchema,
  })
  async toggleCardLabel(
    args: z.infer<typeof ToggleLabelSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.addOrRemoveLabel({ ...args, userId: user.id });
  }

  @Tool({
    name: "toggle_card_member",
    description: "Assign a workspace member to a card, or unassign them.",
    parameters: ToggleMemberSchema,
  })
  async toggleCardMember(
    args: z.infer<typeof ToggleMemberSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.addOrRemoveMember({ ...args, userId: user.id });
  }

  @Tool({
    name: "add_card_comment",
    description: "Add a comment to a card.",
    parameters: AddCommentSchema,
  })
  async addCardComment(
    args: z.infer<typeof AddCommentSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.addComment({ ...args, userId: user.id });
  }

  @Tool({
    name: "update_card_comment",
    description: "Edit a comment on a card.",
    parameters: UpdateCommentSchema,
  })
  async updateCardComment(
    args: z.infer<typeof UpdateCommentSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.updateComment({ ...args, userId: user.id });
  }

  @Tool({
    name: "delete_card_comment",
    description: "Delete a comment from a card.",
    parameters: CommentIdSchema,
  })
  async deleteCardComment(
    args: z.infer<typeof CommentIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.deleteComment({ ...args, userId: user.id });
  }
}
