import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const IntegrationProviderSchema = z.object({
  provider: z.string(),
  userId: z.string(),
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
});

export class IntegrationProviderDto extends createZodDto(
  IntegrationProviderSchema,
) {}

export const DisconnectIntegrationSchema = z.object({
  provider: z.enum(["trello", "github"]),
});

export class DisconnectIntegrationDto extends createZodDto(
  DisconnectIntegrationSchema,
) {}

export const EmptyResponseSchema = z.object({});

export class EmptyResponseDto extends createZodDto(EmptyResponseSchema) {}

export const AuthorizationUrlQuerySchema = z.object({
  provider: z.enum(["trello"]),
});

export class AuthorizationUrlQueryDto extends createZodDto(
  AuthorizationUrlQuerySchema,
) {}

export const AuthorizationUrlResponseSchema = z.object({ url: z.string() });

export class AuthorizationUrlResponseDto extends createZodDto(
  AuthorizationUrlResponseSchema,
) {}

export const SaveGitHubTokenSchema = z.object({ token: z.string() });

export class SaveGitHubTokenDto extends createZodDto(SaveGitHubTokenSchema) {}

export const SuccessResponseSchema = z.object({ success: z.boolean() });

export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}

export const GitHubStatusResponseSchema = z.object({ connected: z.boolean() });

export class GitHubStatusResponseDto extends createZodDto(
  GitHubStatusResponseSchema,
) {}
