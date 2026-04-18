import { z } from "zod";

import {
  checklistResponseSchema,
  labelSchema,
  workspaceMemberSchema,
} from "./common";

// ─── card.create ─────────────────────────────────────────────
export const cardCreateResponseSchema = z.object({
  publicId: z.string(),
});

// ─── card.update ─────────────────────────────────────────────
export const cardUpdateResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.date().nullable(),
});

// ─── Comment responses ───────────────────────────────────────
export const commentResponseSchema = z.object({
  publicId: z.string(),
  comment: z.string(),
});

export const commentDeleteResponseSchema = z.object({
  publicId: z.string(),
});

// ─── card.byId ───────────────────────────────────────────────

const cardMemberSchema = z.object({
  publicId: z.string(),
  email: z.string(),
  user: z
    .object({
      name: z.string().nullable(),
    })
    .nullable(),
});

export const cardDetailSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.date().nullable(),
  createdBy: z.string().nullable(),
  labels: z.array(labelSchema),
  attachments: z.array(
    z.object({
      publicId: z.string(),
      contentType: z.string(),
      s3Key: z.string(),
      originalFilename: z.string().nullable(),
      size: z.number().nullable(),
      url: z.string().nullable(),
    }),
  ),
  checklists: z.array(checklistResponseSchema),
  list: z.object({
    publicId: z.string(),
    name: z.string(),
    board: z.object({
      publicId: z.string(),
      name: z.string(),
      labels: z.array(labelSchema),
      lists: z.array(
        z.object({
          publicId: z.string(),
          name: z.string(),
        }),
      ),
      workspace: z.object({
        publicId: z.string(),
        members: z.array(workspaceMemberSchema),
      }),
    }),
  }),
  members: z.array(cardMemberSchema),
  activities: z.array(
    z.object({
      publicId: z.string(),
      type: z.string(),
      createdAt: z.date(),
      fromIndex: z.number().nullable(),
      toIndex: z.number().nullable(),
      fromTitle: z.string().nullable(),
      toTitle: z.string().nullable(),
      fromDescription: z.string().nullable(),
      toDescription: z.string().nullable(),
      fromDueDate: z.date().nullable(),
      toDueDate: z.date().nullable(),
      fromList: z
        .object({
          publicId: z.string(),
          name: z.string(),
          index: z.number(),
        })
        .nullable(),
      toList: z
        .object({
          publicId: z.string(),
          name: z.string(),
          index: z.number(),
        })
        .nullable(),
      label: z
        .object({
          publicId: z.string(),
          name: z.string(),
        })
        .nullable(),
      member: z
        .object({
          publicId: z.string(),
          user: z
            .object({
              name: z.string().nullable(),
              email: z.string(),
            })
            .nullable(),
        })
        .nullable(),
      user: z
        .object({
          name: z.string().nullable(),
          email: z.string(),
        })
        .nullable(),
      comment: z
        .object({
          publicId: z.string(),
          comment: z.string(),
          createdBy: z.string().nullable(),
          updatedAt: z.date().nullable(),
          deletedAt: z.date().nullable(),
        })
        .nullable(),
    }),
  ),
});

// ─── card.getActivities ──────────────────────────────────────
export const activityItemSchema = z.object({
  publicId: z.string(),
  type: z.string(),
  createdAt: z.date(),
  fromIndex: z.number().nullable(),
  toIndex: z.number().nullable(),
  fromTitle: z.string().nullable(),
  toTitle: z.string().nullable(),
  fromDescription: z.string().nullable(),
  toDescription: z.string().nullable(),
  fromDueDate: z.date().nullable(),
  toDueDate: z.date().nullable(),
  fromList: z
    .object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
    })
    .nullable(),
  toList: z
    .object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
    })
    .nullable(),
  label: z
    .object({
      publicId: z.string(),
      name: z.string(),
    })
    .nullable(),
  member: z
    .object({
      publicId: z.string(),
      user: z
        .object({
          name: z.string().nullable(),
          email: z.string(),
          image: z.string().nullable(),
        })
        .nullable(),
    })
    .nullable(),
  user: z
    .object({
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  comment: z
    .object({
      publicId: z.string(),
      comment: z.string(),
      createdBy: z.string().nullable(),
      updatedAt: z.date().nullable(),
      deletedAt: z.date().nullable(),
    })
    .nullable(),
  attachment: z
    .object({
      publicId: z.string(),
      filename: z.string(),
      originalFilename: z.string().nullable(),
    })
    .nullable(),
});
