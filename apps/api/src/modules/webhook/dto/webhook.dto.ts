import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { webhookUrlSchema } from "@kan/server/utils/webhook";
import { webhookEvents } from "@kan/db/schema";

const WebhookEventSchema = z.enum(webhookEvents);

// webhookUrlSchema is zod 3 (packages/server), so it can't be nested in a zod 4
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
  name: z.string().min(1).max(255).describe("A label for the webhook."),
  url: WebhookUrlSchema.describe(
    "HTTPS URL to send events to. Must be a public host.",
  ),
  secret: z
    .string()
    .max(512)
    .optional()
    .describe(
      "Secret used to sign each delivery so the receiver can verify it.",
    ),
  events: z
    .array(WebhookEventSchema)
    .min(1)
    .describe("Card events to send, e.g. ['card.created', 'card.moved']."),
});

export class CreateWebhookDto extends createZodDto(CreateWebhookSchema) {}

export const UpdateWebhookSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("New label for the webhook."),
  url: WebhookUrlSchema.optional().describe(
    "New HTTPS URL to send events to. Must be a public host.",
  ),
  secret: z
    .string()
    .max(512)
    .optional()
    .describe("New secret used to sign deliveries."),
  events: z
    .array(WebhookEventSchema)
    .min(1)
    .optional()
    .describe("Card events to send, e.g. ['card.created', 'card.moved']."),
  active: z.boolean().optional().describe("Whether the webhook sends events."),
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
