import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const LabelResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

export class LabelResponseDto extends createZodDto(LabelResponseSchema) {}

export const CreateLabelSchema = z.object({
  name: z.string().min(1).max(36).describe("Label name."),
  boardPublicId: z
    .string()
    .min(12)
    .describe("Public ID of the board the label belongs to."),
  colourCode: z
    .string()
    .length(7)
    .describe("Label colour as a hex code, e.g. #0d9488."),
});

export class CreateLabelDto extends createZodDto(CreateLabelSchema) {}

export const UpdateLabelSchema = z.object({
  name: z.string().min(1).max(36).describe("Label name."),
  colourCode: z
    .string()
    .length(7)
    .describe("Label colour as a hex code, e.g. #0d9488."),
});

export class UpdateLabelDto extends createZodDto(UpdateLabelSchema) {}

export const DeleteLabelResponseSchema = z.object({
  success: z.boolean(),
});

export class DeleteLabelResponseDto extends createZodDto(
  DeleteLabelResponseSchema,
) {}
