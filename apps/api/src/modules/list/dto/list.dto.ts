import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ListResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
});

export class ListResponseDto extends createZodDto(ListResponseSchema) {}

export const CreateListSchema = z.object({
  name: z.string().min(1),
  boardPublicId: z.string().min(12),
});

export class CreateListDto extends createZodDto(CreateListSchema) {}

export const UpdateListSchema = z.object({
  name: z.string().min(1).optional(),
  index: z.number().optional(),
});

export class UpdateListDto extends createZodDto(UpdateListSchema) {}

export const DeleteListResponseSchema = z.object({
  success: z.boolean(),
});

export class DeleteListResponseDto extends createZodDto(
  DeleteListResponseSchema,
) {}
