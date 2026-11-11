import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { stripHtml } from "@kan/shared/utils";

export const ChecklistResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
});

export class ChecklistResponseDto extends createZodDto(
  ChecklistResponseSchema,
) {}

export const CreateChecklistSchema = z.object({
  name: z.string().min(1).max(255),
});

export class CreateChecklistDto extends createZodDto(
  CreateChecklistSchema,
) {}

export const UpdateChecklistSchema = z.object({
  name: z.string().min(1).max(255),
});

export class UpdateChecklistDto extends createZodDto(
  UpdateChecklistSchema,
) {}

export const DeleteChecklistResponseSchema = z.object({
  success: z.boolean(),
});

export class DeleteChecklistResponseDto extends createZodDto(
  DeleteChecklistResponseSchema,
) {}

export const ChecklistItemResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export class ChecklistItemResponseDto extends createZodDto(
  ChecklistItemResponseSchema,
) {}

export const CreateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).transform(stripHtml),
});

export class CreateChecklistItemDto extends createZodDto(
  CreateChecklistItemSchema,
) {}

export const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).transform(stripHtml).optional(),
  completed: z.boolean().optional(),
  index: z.number().int().min(0).optional(),
});

export class UpdateChecklistItemDto extends createZodDto(
  UpdateChecklistItemSchema,
) {}
