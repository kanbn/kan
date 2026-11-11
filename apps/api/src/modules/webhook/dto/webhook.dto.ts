import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { webhookUrlSchema } from "@kan/api/utils/webhook";
import { webhookEvents } from "@kan/db/schema";

const WebhookEventSchema = z.enum(webhookEvents);

// webhookUrlSchema is zod 3 (packages/api), so it can't be nested in a zod 4
// object; delegate to it so the SSRF rules stay in one place.
const WebhookUrlSchema = z.string().superRefine((url, ctx) => {
  const result = webhookUrlSchema.safeParse(url);
  if (!result.success)
    for (const issue of result.error.issues)
      ctx.addIssue({ code: "custom", message: issue.message });
});

export const WebhookResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  url: z.string(),
  events: z.array(WebhookEventSchema),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
});

export class WebhookResponseDto extends createZodDto(WebhookResponseSchema) {}

export const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: WebhookUrlSchema,
  secret: z.string().max(512).optional(),
  events: z.array(WebhookEventSchema).min(1),
});

export class CreateWebhookDto extends createZodDto(CreateWebhookSchema) {}

export const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: WebhookUrlSchema.optional(),
  secret: z.string().max(512).optional(),
  events: z.array(WebhookEventSchema).min(1).optional(),
  active: z.boolean().optional(),
});

export class UpdateWebhookDto extends createZodDto(UpdateWebhookSchema) {}

export const DeleteWebhookResponseSchema = z.object({ success: z.boolean() });

export class DeleteWebhookResponseDto extends createZodDto(
  DeleteWebhookResponseSchema,
) {}

export const TestWebhookResponseSchema = z.object({
  success: z.boolean(),
  statusCode: z.number().optional(),
  error: z.string().optional(),
});

export class TestWebhookResponseDto extends createZodDto(
  TestWebhookResponseSchema,
) {}
