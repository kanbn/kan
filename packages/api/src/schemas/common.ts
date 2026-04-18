import { z } from "zod";

// Shared label schema used across board and card responses
export const labelSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

// Shared checklist item schema
export const checklistItemResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  completed: z.boolean(),
  index: z.number(),
});

// Shared checklist schema with items
export const checklistResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  index: z.number(),
  items: z.array(checklistItemResponseSchema),
});

// Shared user sub-object (used inside member/workspace responses)
export const userSchema = z.object({
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
});

// Workspace member sub-object
export const workspaceMemberSchema = z.object({
  publicId: z.string(),
  email: z.string(),
  status: z.string(),
  user: userSchema.nullable(),
});
