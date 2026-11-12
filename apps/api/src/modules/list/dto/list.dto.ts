import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ListResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
});

export class ListResponseDto extends createZodDto(ListResponseSchema) {}

export const CreateListSchema = z.object({
  name: z.string().min(1).describe("List name."),
  boardPublicId: z
    .string()
    .min(12)
    .describe("Public ID of the board to add the list to."),
});

export class CreateListDto extends createZodDto(CreateListSchema) {}

export const UpdateListSchema = z.object({
  name: z.string().min(1).optional().describe("New list name."),
  index: z
    .number()
    .optional()
    .describe("Zero-based position of the list on the board; 0 is leftmost."),
});

export class UpdateListDto extends createZodDto(UpdateListSchema) {}

export const DeleteListResponseSchema = z.object({
  success: z.boolean(),
});

export class DeleteListResponseDto extends createZodDto(
  DeleteListResponseSchema,
) {}
