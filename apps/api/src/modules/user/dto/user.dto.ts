import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  hasPassword: z.boolean(),
  hasMagicLinkAccount: z.boolean(),
  apiKey: z
    .object({ id: z.number(), prefix: z.string().nullable() })
    .nullable(),
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}

export const UpdateUserSchema = z.object({
  name: z.string().optional().describe("New display name."),
  image: z.string().optional().describe("New avatar image URL."),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

export const UpdateUserResponseSchema = z.object({
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export class UpdateUserResponseDto extends createZodDto(
  UpdateUserResponseSchema,
) {}

export const SetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export class SetPasswordDto extends createZodDto(SetPasswordSchema) {}

export const SuccessResponseSchema = z.object({ success: z.boolean() });

export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}
