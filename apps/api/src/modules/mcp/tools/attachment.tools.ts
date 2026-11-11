import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { AttachmentService } from "../../attachment/attachment.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { Tool } from "../tool.decorator.js";

const DeleteAttachmentSchema = z.object({
  attachmentPublicId: z.string().min(12),
});

@Injectable()
export class AttachmentTools {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Tool({
    name: "delete_attachment",
    description:
      "Delete an attachment from a card, on behalf of the current user.",
    parameters: DeleteAttachmentSchema,
  })
  async deleteAttachment(
    args: z.infer<typeof DeleteAttachmentSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.attachmentService.delete({
      attachmentPublicId: args.attachmentPublicId,
      userId: user.id,
    });
  }
}
