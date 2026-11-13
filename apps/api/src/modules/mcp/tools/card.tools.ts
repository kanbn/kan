import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
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
import {
  cardPublicId,
  commentPublicId,
  labelPublicId,
  workspaceMemberPublicId,
} from "./public-ids.js";

const CardIdSchema = z.object({ cardPublicId });
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
  commentPublicId,
});
const UpdateCommentSchema = CommentIdSchema.extend(CommentSchema.shape);
const ToggleLabelSchema = CardIdSchema.extend({
  labelPublicId,
});
const ToggleMemberSchema = CardIdSchema.extend({
  workspaceMemberPublicId,
});

type McpRequest = { user?: unknown } | undefined;

@UseFilters(McpExceptionFilter)
@McpController()
export class CardTools {
  constructor(private readonly cardService: CardService) {}

  @Tool({
    name: "get_card",
    description:
      "Get a card with its labels, members, checklists, attachments and recent activity.",
    parameters: CardIdSchema,
  })
  async getCard(
    @Payload() args: z.infer<typeof CardIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof ActivitiesWithIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.getActivities({ ...args, userId: user.id });
  }

  @Tool({
    name: "create_card",
    description:
      "Create a card in a list, optionally with labels, members and a due date (ISO 8601).",
    parameters: CreateCardWithDefaultsSchema,
  })
  async createCard(
    @Payload() args: z.infer<typeof CreateCardWithDefaultsSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    description:
      "Update a card's title, description or due date, or move it (listPublicId and/or index).",
    parameters: UpdateCardWithIdSchema,
  })
  async updateCard(
    @Payload() args: z.infer<typeof UpdateCardWithIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof CardIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    description:
      "Duplicate a card into a list, optionally copying labels, members and checklists.",
    parameters: DuplicateCardWithIdSchema,
  })
  async duplicateCard(
    @Payload() args: z.infer<typeof DuplicateCardWithIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof ToggleLabelSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof ToggleMemberSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof AddCommentSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof UpdateCommentSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
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
    @Payload() args: z.infer<typeof CommentIdSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.cardService.deleteComment({ ...args, userId: user.id });
  }
}
