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
  customData: z.unknown(),
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
      id: z.string().nullable(),
      name: z.string().nullable(),
    })
    .nullable(),
});

export const cardDetailSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cardNumber: z.number().nullable(),
  index: z.number(),
  dueDate: z.date().nullable(),
  createdBy: z.string().nullable(),
  customData: z.record(z.string(), z.unknown()).nullable(),
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
      customFieldsConfig: z.string().nullable(),
      labels: z.array(labelSchema),
      lists: z.array(
        z.object({
          publicId: z.string(),
          name: z.string(),
        }),
      ),
      workspace: z.object({
        publicId: z.string(),
        cardPrefix: z.string(),
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
              name: z.string().nullable().optional(),
              email: z.string(),
            })
            .nullable(),
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
      user: z
        .object({
          name: z.string().nullable(),
          email: z.string(),
          id: z.string().nullable().optional(),
          image: z.string().nullable().optional(),
        })
        .nullable(),
    }),
  ),
});

export const cardCustomFieldValuesRequestSchema = z.object({
  boardPublicId: z.string().min(12),
  fieldKey: z.string(),
  sectionKey: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const cardCustomFieldValuesResponseSchema = z.array(z.string());

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
          id: z.string().nullable(),
          name: z.string().nullable(),
          email: z.string(),
          image: z.string().nullable(),
        })
        .nullable(),
    })
    .nullable(),
  user: z
    .object({
      id: z.string().nullable(),
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
