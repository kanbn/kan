import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const relativePath = z.string().regex(/^\/(?!\/)/);

export const CreateCheckoutSessionSchema = z
  .object({
    successUrl: relativePath,
    cancelUrl: relativePath,
    plan: z.string(),
    billing: z.string().optional(),
    workspacePublicId: z.string().optional(),
    workspaceSlug: z
      .string()
      .min(3)
      .max(64)
      .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
      .optional(),
    workspaceName: z.string().optional(),
    workspaceDescription: z.string().optional(),
  })
  .refine((b) => b.workspacePublicId ?? b.workspaceName, {
    message: "Must provide workspacePublicId or workspaceName",
  });

export class CreateCheckoutSessionDto extends createZodDto(
  CreateCheckoutSessionSchema,
) {}

export class SessionUrlResponseDto extends createZodDto(
  z.object({ url: z.string().nullable() }),
) {}
