import type { z } from "zod";
import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";

import { CreateFeedbackSchema } from "../../feedback/dto/create-feedback.dto.js";
import { FeedbackService } from "../../feedback/feedback.service.js";
import { requireMcpUser } from "../mcp-user.util.js";

@Injectable()
export class FeedbackTools {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Tool({
    name: "submit_feedback",
    description: "Submit feedback about kan on behalf of the current user.",
    parameters: CreateFeedbackSchema,
  })
  async submitFeedback(
    args: z.infer<typeof CreateFeedbackSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.feedbackService.create({
      feedback: args.feedback,
      url: args.url,
      userId: user.id,
    });
  }
}
