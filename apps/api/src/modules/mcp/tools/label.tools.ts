import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";

import {
  CreateLabelSchema,
  UpdateLabelSchema,
} from "../../label/dto/label.dto.js";
import { LabelService } from "../../label/label.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { labelPublicId } from "./public-ids.js";

const GetLabelSchema = z.object({
  labelPublicId,
});

const DeleteLabelSchema = z.object({
  labelPublicId,
});

const UpdateLabelWithIdSchema = UpdateLabelSchema.extend({
  labelPublicId,
});

@Injectable()
export class LabelTools {
  constructor(private readonly labelService: LabelService) {}

  @Tool({
    name: "get_label",
    description: "Get a label by public ID, on behalf of the current user.",
    parameters: GetLabelSchema,
  })
  async getLabel(
    args: z.infer<typeof GetLabelSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.labelService.byPublicId({
      labelPublicId: args.labelPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "create_label",
    description: "Create a label on a board, on behalf of the current user.",
    parameters: CreateLabelSchema,
  })
  async createLabel(
    args: z.infer<typeof CreateLabelSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.labelService.create({
      name: args.name,
      boardPublicId: args.boardPublicId,
      colourCode: args.colourCode,
      userId: user.id,
    });
  }

  @Tool({
    name: "update_label",
    description:
      "Update a label's name or colour, on behalf of the current user.",
    parameters: UpdateLabelWithIdSchema,
  })
  async updateLabel(
    args: z.infer<typeof UpdateLabelWithIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.labelService.update({
      labelPublicId: args.labelPublicId,
      name: args.name,
      colourCode: args.colourCode,
      userId: user.id,
    });
  }

  @Tool({
    name: "delete_label",
    description: "Delete a label, on behalf of the current user.",
    parameters: DeleteLabelSchema,
  })
  async deleteLabel(
    args: z.infer<typeof DeleteLabelSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.labelService.delete({
      labelPublicId: args.labelPublicId,
      userId: user.id,
    });
  }
}
