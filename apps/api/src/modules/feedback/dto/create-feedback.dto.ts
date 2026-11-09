import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateFeedbackSchema = z.object({
  feedback: z.string().min(1),
  url: z.string().min(1),
});

export const CreateFeedbackResponseSchema = z.object({
  success: z.boolean(),
});

export class CreateFeedbackDto extends createZodDto(CreateFeedbackSchema) {}
export class CreateFeedbackResponseDto extends createZodDto(
  CreateFeedbackResponseSchema,
) {}
