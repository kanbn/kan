import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const InviteMemberSchema = z.object({
  email: z.string().email().describe("Email address to invite."),
});

export class InviteMemberDto extends createZodDto(InviteMemberSchema) {}

export const MemberInviteResponseSchema = z.object({
  publicId: z.string(),
});

export class MemberInviteResponseDto extends createZodDto(
  MemberInviteResponseSchema,
) {}

export const DeleteMemberResponseSchema = z.object({ success: z.boolean() });

export class DeleteMemberResponseDto extends createZodDto(
  DeleteMemberResponseSchema,
) {}

export const UpdateMemberRoleSchema = z.object({
  role: z
    .enum(["admin", "member", "guest"])
    .describe("New workspace role: 'admin', 'member' or 'guest'."),
});

export class UpdateMemberRoleDto extends createZodDto(UpdateMemberRoleSchema) {}

export const UpdateMemberRoleResponseSchema = z.object({
  success: z.boolean(),
  role: z.string(),
});

export class UpdateMemberRoleResponseDto extends createZodDto(
  UpdateMemberRoleResponseSchema,
) {}

export const ActiveInviteLinkResponseSchema = z.object({
  id: z.number().optional(),
  inviteCode: z.string().optional(),
  inviteLink: z.string().optional(),
  isActive: z.boolean(),
  expiresAt: z.iso.datetime().optional(),
});

export class ActiveInviteLinkResponseDto extends createZodDto(
  ActiveInviteLinkResponseSchema,
) {}

export const CreateInviteLinkResponseSchema = z.object({
  publicId: z.string(),
  inviteCode: z.string(),
  inviteLink: z.string(),
  expiresAt: z.iso.datetime().nullable(),
});

export class CreateInviteLinkResponseDto extends createZodDto(
  CreateInviteLinkResponseSchema,
) {}

export const DeactivateInviteLinkResponseSchema = z.object({
  success: z.boolean(),
});

export class DeactivateInviteLinkResponseDto extends createZodDto(
  DeactivateInviteLinkResponseSchema,
) {}

export const InviteByCodeResponseSchema = z.object({
  publicId: z.string(),
  status: z.string(),
  expiresAt: z.iso.datetime().nullable(),
});

export class InviteByCodeResponseDto extends createZodDto(
  InviteByCodeResponseSchema,
) {}

export const AcceptInviteLinkSchema = z.object({
  inviteCode: z.string().min(12),
});

export class AcceptInviteLinkDto extends createZodDto(AcceptInviteLinkSchema) {}

export const AcceptInviteLinkResponseSchema = z.object({
  success: z.boolean(),
  workspacePublicId: z.string().optional(),
  workspaceSlug: z.string().optional(),
});

export class AcceptInviteLinkResponseDto extends createZodDto(
  AcceptInviteLinkResponseSchema,
) {}
