import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ExternalSourceItemSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export class ExternalSourceItemDto extends createZodDto(
  ExternalSourceItemSchema,
) {}

export const ImportTrelloBoardsSchema = z.object({
  boardIds: z.array(z.string()),
  workspacePublicId: z.string().min(12),
});

export class ImportTrelloBoardsDto extends createZodDto(
  ImportTrelloBoardsSchema,
) {}

export const ImportTrelloBoardsResponseSchema = z.object({
  boardsCreated: z.number(),
});

export class ImportTrelloBoardsResponseDto extends createZodDto(
  ImportTrelloBoardsResponseSchema,
) {}

export const ImportGitHubProjectsSchema = z.object({
  projectIds: z.array(z.string()),
  workspacePublicId: z.string().min(12),
});

export class ImportGitHubProjectsDto extends createZodDto(
  ImportGitHubProjectsSchema,
) {}

export const ImportGitHubProjectsResponseSchema = z.object({
  projectsImported: z.number(),
});

export class ImportGitHubProjectsResponseDto extends createZodDto(
  ImportGitHubProjectsResponseSchema,
) {}
