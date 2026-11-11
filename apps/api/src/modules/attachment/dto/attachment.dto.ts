import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const GenerateUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  size: z
    .number()
    .positive()
    .max(50 * 1024 * 1024),
});

export class GenerateUploadUrlDto extends createZodDto(
  GenerateUploadUrlSchema,
) {}

export const UploadUrlResponseSchema = z.object({
  url: z.string(),
  key: z.string(),
});

export class UploadUrlResponseDto extends createZodDto(
  UploadUrlResponseSchema,
) {}

export const ConfirmAttachmentSchema = z.object({
  s3Key: z.string(),
  filename: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  size: z.number().positive(),
});

export class ConfirmAttachmentDto extends createZodDto(
  ConfirmAttachmentSchema,
) {}

export const AttachmentResponseSchema = z.object({
  publicId: z.string(),
  filename: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  size: z.number(),
  s3Key: z.string(),
  createdAt: z.iso.datetime(),
});

export class AttachmentResponseDto extends createZodDto(
  AttachmentResponseSchema,
) {}

export const DeleteAttachmentResponseSchema = z.object({
  success: z.boolean(),
});

export class DeleteAttachmentResponseDto extends createZodDto(
  DeleteAttachmentResponseSchema,
) {}
