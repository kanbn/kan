import { z } from "zod";

import {
  checklistResponseSchema,
  labelSchema,
  workspaceMemberSchema,
} from "./common";

// ─── board.all ───────────────────────────────────────────────
export const boardListItemSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  favorite: z.boolean(),
  lists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
      wipLimit: z.number().int().nullable(),
    }),
  ),
  labels: z.array(labelSchema),
});

// ─── Card sub-object inside board detail (byId) ─────────────
const boardCardMemberSchema = z.object({
  publicId: z.string(),
  email: z.string(),
  user: z
    .object({
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
});

const boardDetailCardSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  index: z.number(),
  dueDate: z.date().nullable(),
  labels: z.array(labelSchema),
  members: z.array(boardCardMemberSchema),
  attachments: z.array(z.object({ publicId: z.string() })),
  checklists: z.array(checklistResponseSchema),
  comments: z.array(z.object({ publicId: z.string() })),
});

// ─── board.byId ──────────────────────────────────────────────
export const boardDetailSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  visibility: z.string(),
  isArchived: z.boolean(),
  favorite: z.boolean(),
  workspace: z.object({
    publicId: z.string(),
    members: z.array(workspaceMemberSchema),
  }),
  labels: z.array(labelSchema),
  lists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
      wipLimit: z.number().int().nullable(),
      cards: z.array(boardDetailCardSchema),
    }),
  ),
  allLists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
    }),
  ),
});

// ─── Card sub-object inside board detail (bySlug — no members) ─
const boardSlugCardSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  index: z.number(),
  dueDate: z.date().nullable(),
  labels: z.array(labelSchema),
  attachments: z.array(z.object({ publicId: z.string() })),
  checklists: z.array(checklistResponseSchema),
  comments: z.array(z.object({ publicId: z.string() })),
});

// ─── board.bySlug ────────────────────────────────────────────
export const boardBySlugSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  visibility: z.string(),
  workspace: z.object({
    publicId: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  labels: z.array(labelSchema),
  lists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
      wipLimit: z.number().int().nullable(),
      cards: z.array(boardSlugCardSchema),
    }),
  ),
  allLists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
    }),
  ),
});

// ─── board.create / board.createFromSnapshot ─────────────────
export const boardCreateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
});

// ─── board.update ────────────────────────────────────────────
export const boardUpdateResponseSchema = z.union([
  z.object({ success: z.boolean() }),
  z.object({ publicId: z.string(), name: z.string() }),
]);
