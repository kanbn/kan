import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { memberStatuses } from "@kan/db/schema";

const isoDate = z.iso.datetime();
// Request due dates arrive as ISO strings; the service works with Dates.
const dueDateInput = isoDate
  .transform((value) => new Date(value))
  .nullable()
  .optional();

const labelSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

const listRefSchema = z
  .object({ publicId: z.string(), name: z.string(), index: z.number() })
  .nullable();

const commentRefSchema = z
  .object({
    publicId: z.string(),
    comment: z.string(),
    createdBy: z.string().nullable(),
    updatedAt: isoDate.nullable(),
    deletedAt: isoDate.nullable(),
  })
  .nullable();

const activityBase = {
  publicId: z.string(),
  type: z.string(),
  createdAt: isoDate,
  fromIndex: z.number().nullable(),
  toIndex: z.number().nullable(),
  fromTitle: z.string().nullable(),
  toTitle: z.string().nullable(),
  fromDescription: z.string().nullable(),
  toDescription: z.string().nullable(),
  fromDueDate: isoDate.nullable(),
  toDueDate: isoDate.nullable(),
  fromList: listRefSchema,
  toList: listRefSchema,
  label: z.object({ publicId: z.string(), name: z.string() }).nullable(),
  comment: commentRefSchema,
};

// ─── create ──────────────────────────────────────────────────

export const CreateCardSchema = z.object({
  title: z.string().min(1).max(2000).describe("Card title."),
  description: z
    .string()
    .max(10000)
    .describe(
      "Card description. Plain text, or markdown or HTML for formatting.",
    ),
  listPublicId: z
    .string()
    .min(12)
    .describe("Public ID of the list to add the card to."),
  labelPublicIds: z
    .array(z.string().min(12))
    .describe("Public IDs of board labels to attach."),
  memberPublicIds: z
    .array(z.string().min(12))
    .describe("Public IDs of workspace members (not user IDs) to assign."),
  position: z
    .enum(["start", "end"])
    .describe("Add the card at the start or end of the list."),
  dueDate: dueDateInput.describe(
    "Due date in ISO 8601, e.g. 2026-12-31T17:00:00Z.",
  ),
});

export class CreateCardDto extends createZodDto(CreateCardSchema) {}

export const PublicIdResponseSchema = z.object({ publicId: z.string() });

export class PublicIdResponseDto extends createZodDto(PublicIdResponseSchema) {}

// ─── update ──────────────────────────────────────────────────

export const UpdateCardSchema = z.object({
  title: z.string().min(1).max(2000).optional().describe("New card title."),
  description: z
    .string()
    .optional()
    .describe(
      "New card description. Plain text, or markdown or HTML for formatting.",
    ),
  index: z
    .number()
    .optional()
    .describe(
      "Zero-based position in the card's list, or in listPublicId when moving; 0 is the top.",
    ),
  listPublicId: z
    .string()
    .min(12)
    .optional()
    .describe("Public ID of a list to move the card to."),
  dueDate: dueDateInput.describe(
    "Due date in ISO 8601, e.g. 2026-12-31T17:00:00Z, or null to clear it.",
  ),
});

export class UpdateCardDto extends createZodDto(UpdateCardSchema) {}

export const CardUpdateResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: isoDate.nullable(),
});

export class CardUpdateResponseDto extends createZodDto(
  CardUpdateResponseSchema,
) {}

export const SuccessResponseSchema = z.object({ success: z.boolean() });

export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}

// ─── comments ────────────────────────────────────────────────

export const CommentSchema = z.object({
  comment: z
    .string()
    .min(1)
    .describe("Comment text. Plain text, or markdown or HTML for formatting."),
});

export class CommentDto extends createZodDto(CommentSchema) {}

export const CommentResponseSchema = z.object({
  publicId: z.string(),
  comment: z.string(),
});

export class CommentResponseDto extends createZodDto(CommentResponseSchema) {}

// ─── labels / members ────────────────────────────────────────

export const ToggleLabelResponseSchema = z.object({ newLabel: z.boolean() });

export class ToggleLabelResponseDto extends createZodDto(
  ToggleLabelResponseSchema,
) {}

export const ToggleMemberResponseSchema = z.object({ newMember: z.boolean() });

export class ToggleMemberResponseDto extends createZodDto(
  ToggleMemberResponseSchema,
) {}

// ─── duplicate ───────────────────────────────────────────────

export const DuplicateCardSchema = z.object({
  listPublicId: z
    .string()
    .min(12)
    .describe("Public ID of the list to put the copy in."),
  index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based position in that list. Defaults to the end."),
  title: z
    .string()
    .min(1)
    .max(2000)
    .optional()
    .describe("Title for the copy. Defaults to the original title."),
  copyLabels: z.boolean().describe("Copy the card's labels."),
  copyMembers: z.boolean().describe("Copy the card's assigned members."),
  copyChecklists: z.boolean().describe("Copy the card's checklists."),
});

export class DuplicateCardDto extends createZodDto(DuplicateCardSchema) {}

// ─── byId ────────────────────────────────────────────────────

export const CardDetailSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  cardNumber: z.number().nullable(),
  index: z.number(),
  dueDate: isoDate.nullable(),
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
  checklists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
      items: z.array(
        z.object({
          publicId: z.string(),
          title: z.string(),
          completed: z.boolean(),
          index: z.number(),
        }),
      ),
    }),
  ),
  list: z.object({
    publicId: z.string(),
    name: z.string(),
    board: z.object({
      publicId: z.string(),
      name: z.string(),
      labels: z.array(labelSchema),
      lists: z.array(z.object({ publicId: z.string(), name: z.string() })),
      workspace: z.object({
        publicId: z.string(),
        cardPrefix: z.string(),
        members: z.array(
          z.object({
            publicId: z.string(),
            email: z.string(),
            status: z.enum(memberStatuses),
            user: z
              .object({
                id: z.string().nullable(),
                name: z.string().nullable(),
                email: z.string(),
                image: z.string().nullable(),
              })
              .nullable(),
          }),
        ),
      }),
    }),
  }),
  members: z.array(
    z.object({
      publicId: z.string(),
      email: z.string(),
      status: z.enum(memberStatuses),
      user: z
        .object({ id: z.string().nullable(), name: z.string().nullable() })
        .nullable(),
    }),
  ),
  activities: z.array(
    z.object({
      ...activityBase,
      member: z
        .object({
          publicId: z.string(),
          user: z
            .object({ name: z.string().nullable(), email: z.string() })
            .nullable(),
        })
        .nullable(),
      user: z
        .object({ name: z.string().nullable(), email: z.string() })
        .nullable(),
    }),
  ),
});

export class CardDetailDto extends createZodDto(CardDetailSchema) {}

// ─── activities ──────────────────────────────────────────────

export const ActivitiesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Maximum number of activities to return."),
  cursor: isoDate
    .optional()
    .describe("Pagination cursor: nextCursor from the previous page."),
  cursorPublicId: z
    .string()
    .length(12)
    .optional()
    .describe("Pagination cursor: nextCursorPublicId from the previous page."),
  order: z
    .enum(["oldest", "newest"])
    .optional()
    .default("oldest")
    .describe("Return the oldest or newest activities first."),
});

export class ActivitiesQueryDto extends createZodDto(ActivitiesQuerySchema) {}

const activityUserSchema = z
  .object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  })
  .nullable();

export const ActivitiesResponseSchema = z.object({
  activities: z.array(
    z.object({
      ...activityBase,
      member: z
        .object({ publicId: z.string(), user: activityUserSchema })
        .nullable(),
      user: activityUserSchema,
      attachment: z
        .object({
          publicId: z.string(),
          filename: z.string(),
          originalFilename: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  hasMore: z.boolean(),
  nextCursor: isoDate.nullable(),
  nextCursorPublicId: z.string().length(12).nullable(),
});

export class ActivitiesResponseDto extends createZodDto(
  ActivitiesResponseSchema,
) {}
