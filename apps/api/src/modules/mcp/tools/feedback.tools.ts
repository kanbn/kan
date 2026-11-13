import type { z } from "zod";
import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";

import { CreateFeedbackSchema } from "../../feedback/dto/create-feedback.dto.js";
import { FeedbackService } from "../../feedback/feedback.service.js";
import { requireMcpUser } from "../mcp-user.util.js";

@UseFilters(McpExceptionFilter)
@McpController()
export class FeedbackTools {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Tool({
    name: "submit_feedback",
    description: "Submit feedback about kan on behalf of the current user.",
    parameters: CreateFeedbackSchema,
  })
  async submitFeedback(
    @Payload() args: z.infer<typeof CreateFeedbackSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.feedbackService.create({
      feedback: args.feedback,
      url: args.url,
      userId: user.id,
    });
  }
}
