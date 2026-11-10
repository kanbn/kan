import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const LabelResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

export class LabelResponseDto extends createZodDto(LabelResponseSchema) {}

export const CreateLabelSchema = z.object({
  name: z.string().min(1).max(36),
  boardPublicId: z.string().min(12),
  colourCode: z.string().length(7),
});

export class CreateLabelDto extends createZodDto(CreateLabelSchema) {}

export const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(36),
  colourCode: z.string().length(7),
});

export class UpdateLabelDto extends createZodDto(UpdateLabelSchema) {}

export const DeleteLabelResponseSchema = z.object({
  success: z.boolean(),
});

export class DeleteLabelResponseDto extends createZodDto(
  DeleteLabelResponseSchema,
) {}
