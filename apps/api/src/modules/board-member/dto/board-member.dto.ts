import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const BoardMemberRoleSchema = z.enum(["admin", "member"]);

export const BoardMemberUserSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
});

export const BoardMemberSchema = z.object({
  publicId: z.string(),
  email: z.string(),
  status: z.string(),
  role: BoardMemberRoleSchema,
  workspaceRole: z.string(),
  createdAt: z.iso.datetime(),
  user: BoardMemberUserSchema.nullable(),
});

export class BoardMemberDto extends createZodDto(BoardMemberSchema) {}

export const AddBoardMemberSchema = z.object({
  workspaceMemberPublicId: z.string().min(12),
  role: BoardMemberRoleSchema.default("member"),
});

export class AddBoardMemberDto extends createZodDto(AddBoardMemberSchema) {}

export const UpdateBoardMemberRoleSchema = z.object({
  role: BoardMemberRoleSchema,
});

export class UpdateBoardMemberRoleDto extends createZodDto(
  UpdateBoardMemberRoleSchema,
) {}

export const BoardMemberRoleResultSchema = z.object({
  publicId: z.string(),
  role: BoardMemberRoleSchema,
});

export class BoardMemberRoleResultDto extends createZodDto(
  BoardMemberRoleResultSchema,
) {}

export const BoardMemberRemoveResponseSchema = z.object({
  publicId: z.string(),
});

export class BoardMemberRemoveResponseDto extends createZodDto(
  BoardMemberRemoveResponseSchema,
) {}
