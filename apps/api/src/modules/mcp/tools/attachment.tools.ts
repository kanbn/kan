import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
import { z } from "zod";

import { AttachmentService } from "../../attachment/attachment.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { attachmentPublicId } from "./public-ids.js";

const DeleteAttachmentSchema = z.object({
  attachmentPublicId,
});

@UseFilters(McpExceptionFilter)
@McpController()
export class AttachmentTools {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Tool({
    name: "delete_attachment",
    description:
      "Delete an attachment from a card, on behalf of the current user.",
    parameters: DeleteAttachmentSchema,
  })
  async deleteAttachment(
    @Payload() args: z.infer<typeof DeleteAttachmentSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.attachmentService.delete({
      attachmentPublicId: args.attachmentPublicId,
      userId: user.id,
    });
  }
}
