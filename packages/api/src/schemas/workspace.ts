import { z } from "zod";

import { userSchema } from "./common";

// ─── workspace.all ───────────────────────────────────────────
export const workspaceListItemSchema = z.object({
  role: z.string(),
  workspace: z.object({
    publicId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    slug: z.string(),
    plan: z.enum(["free", "team", "pro", "enterprise"]),
    weekStartDay: z.number().nullable(),
    deletedAt: z.date().nullable(),
  }),
});

// ─── workspace.byId ──────────────────────────────────────────
const workspaceMemberDetailSchema = z.object({
  publicId: z.string(),
  email: z.string().optional(),
  role: z.string(),
  status: z.string(),
  createdAt: z.date(),
  user: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().optional(),
      image: z.string().nullable(),
    })
    .nullable(),
});

const workspaceSubscriptionSchema = z.object({
  plan: z.string(),
  status: z.string(),
  seats: z.number().nullable(),
  unlimitedSeats: z.boolean().nullable(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
});

export const workspaceDetailSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  showEmailsToMembers: z.boolean().nullable(),
  weekStartDay: z.number().nullable(),
  members: z.array(workspaceMemberDetailSchema),
  subscriptions: z.array(workspaceSubscriptionSchema),
});

// ─── workspace.bySlug ────────────────────────────────────────
export const workspaceWithBoardsSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  boards: z.array(
    z.object({
      publicId: z.string(),
      slug: z.string(),
      name: z.string(),
    }),
  ),
});

// ─── workspace.create ────────────────────────────────────────
export const workspaceCreateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  plan: z.enum(["free", "team", "pro", "enterprise"]),
});

// ─── workspace.update ────────────────────────────────────────
export const workspaceUpdateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  plan: z.enum(["free", "team", "pro", "enterprise"]),
  showEmailsToMembers: z.boolean().nullable(),
  weekStartDay: z.number().nullable(),
});

// ─── workspace.delete ────────────────────────────────────────
export const workspaceDeleteResponseSchema = z.object({
  success: z.boolean(),
});
