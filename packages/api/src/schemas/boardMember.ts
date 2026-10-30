import { z } from "zod";

import { userSchema } from "./common";

export const boardMemberRoleSchema = z.enum(["admin", "member"]);

// ─── boardMember.all ─────────────────────────────────────────
export const boardMemberSchema = z.object({
  publicId: z.string(),
  email: z.string(),
  status: z.string(),
  role: boardMemberRoleSchema,
  workspaceRole: z.string(),
  createdAt: z.date(),
  user: userSchema.nullable(),
});

// ─── boardMember.add ─────────────────────────────────────────
export const boardMemberAddResponseSchema = z.object({
  publicId: z.string(),
  role: boardMemberRoleSchema,
});

// ─── boardMember.updateRole ──────────────────────────────────
export const boardMemberUpdateRoleResponseSchema = z.object({
  publicId: z.string(),
  role: boardMemberRoleSchema,
});

// ─── boardMember.remove ──────────────────────────────────────
export const boardMemberRemoveResponseSchema = z.object({
  publicId: z.string(),
});
