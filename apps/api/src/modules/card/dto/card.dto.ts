import { createZodDto } from "nestjs-zod";
import { z } from "zod";

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
  title: z.string().min(1).max(2000),
  description: z.string().max(10000),
  listPublicId: z.string().min(12),
  labelPublicIds: z.array(z.string().min(12)),
  memberPublicIds: z.array(z.string().min(12)),
  position: z.enum(["start", "end"]),
  dueDate: dueDateInput,
});

export class CreateCardDto extends createZodDto(CreateCardSchema) {}

export const PublicIdResponseSchema = z.object({ publicId: z.string() });

export class PublicIdResponseDto extends createZodDto(PublicIdResponseSchema) {}

// ─── update ──────────────────────────────────────────────────

export const UpdateCardSchema = z.object({
  title: z.string().min(1).max(2000).optional(),
  description: z.string().optional(),
  index: z.number().optional(),
  listPublicId: z.string().min(12).optional(),
  dueDate: dueDateInput,
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

export const CommentSchema = z.object({ comment: z.string().min(1) });

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
  listPublicId: z.string().min(12),
  index: z.number().int().min(0).optional(),
  title: z.string().min(1).max(2000).optional(),
  copyLabels: z.boolean(),
  copyMembers: z.boolean(),
  copyChecklists: z.boolean(),
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
            status: z.string(),
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
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  cursor: isoDate.optional(),
  cursorPublicId: z.string().length(12).optional(),
  order: z.enum(["oldest", "newest"]).optional().default("oldest"),
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
