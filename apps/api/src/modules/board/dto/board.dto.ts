import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { memberStatuses } from "@kan/db/schema";

const slugSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/);

// Repeated query params (?members=a&members=b) parse as an array, a single
// one as a plain string.
const queryArray = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (value === undefined || Array.isArray(value) ? value : [value]),
    z.array(item).optional(),
  );

const dueDateFilterSchema = z.enum([
  "overdue",
  "today",
  "tomorrow",
  "next-week",
  "next-month",
  "no-due-date",
]);

const boardFilterQuery = {
  members: queryArray(z.string().min(12)),
  labels: queryArray(z.string().min(12)),
  lists: queryArray(z.string().min(12)),
  dueDateFilters: queryArray(dueDateFilterSchema),
};

const labelSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

const checklistSchema = z.object({
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
});

const allListsSchema = z.array(
  z.object({ publicId: z.string(), name: z.string() }),
);

// ─── list ────────────────────────────────────────────────────

export const BoardListQuerySchema = z.object({
  type: z.enum(["regular", "template"]).optional(),
  archived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export class BoardListQueryDto extends createZodDto(BoardListQuerySchema) {}

export const BoardListItemSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  favorite: z.boolean(),
  lists: z.array(
    z.object({ publicId: z.string(), name: z.string(), index: z.number() }),
  ),
  labels: z.array(labelSchema),
});

export class BoardListItemDto extends createZodDto(BoardListItemSchema) {}

// ─── byId ────────────────────────────────────────────────────

export const BoardDetailQuerySchema = z.object({
  ...boardFilterQuery,
  type: z.enum(["regular", "template"]).optional(),
  cardView: z.enum(["full", "summary"]).default("full"),
});

export class BoardDetailQueryDto extends createZodDto(BoardDetailQuerySchema) {}

const boardDetailCardSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  index: z.number(),
  cardNumber: z.number().nullable(),
  dueDate: z.iso.datetime().nullable(),
  labels: z.array(labelSchema),
  members: z.array(
    z.object({
      publicId: z.string(),
      email: z.string(),
      status: z.enum(memberStatuses),
      user: z
        .object({
          name: z.string().nullable(),
          email: z.string(),
          image: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
  attachments: z.array(z.object({ publicId: z.string() })),
  checklists: z.array(checklistSchema),
  comments: z.array(z.object({ publicId: z.string() })),
  summary: z
    .object({
      hasDescription: z.boolean(),
      attachmentCount: z.number().int().nonnegative(),
      hasComments: z.boolean(),
      checklistItemCount: z.number().int().nonnegative(),
      completedChecklistItemCount: z.number().int().nonnegative(),
    })
    .optional(),
});

export const BoardDetailSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  visibility: z.enum(["private", "public"]),
  isArchived: z.boolean(),
  favorite: z.boolean(),
  assignedMemberPublicIds: z
    .array(z.string())
    .describe("Members assigned to at least one card on the board."),
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
  labels: z.array(labelSchema),
  lists: z.array(
    z.object({
      publicId: z.string(),
      name: z.string(),
      index: z.number(),
      cards: z.array(boardDetailCardSchema),
    }),
  ),
  allLists: allListsSchema,
});

export class BoardDetailDto extends createZodDto(BoardDetailSchema) {}

// ─── bySlug (public) ─────────────────────────────────────────

export const BoardBySlugQuerySchema = z.object(boardFilterQuery);

export class BoardBySlugQueryDto extends createZodDto(BoardBySlugQuerySchema) {}

export const BoardBySlugSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  visibility: z.enum(["private", "public"]),
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
      cards: z.array(
        z.object({
          publicId: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          index: z.number(),
          dueDate: z.iso.datetime().nullable(),
          labels: z.array(labelSchema),
          attachments: z.array(z.object({ publicId: z.string() })),
          checklists: z.array(checklistSchema),
          comments: z.array(z.object({ publicId: z.string() })),
        }),
      ),
    }),
  ),
  allLists: allListsSchema,
});

export class BoardBySlugDto extends createZodDto(BoardBySlugSchema) {}

// ─── create ──────────────────────────────────────────────────

export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100).describe("Board name."),
  lists: z
    .array(z.string().min(1))
    .describe(
      "Names of the lists to create, in order, e.g. ['To do', 'Done'].",
    ),
  labels: z
    .array(z.string().min(1))
    .describe("Names of the labels to create, e.g. ['Bug', 'Feature']."),
  type: z
    .enum(["regular", "template"])
    .optional()
    .describe(
      "'regular' for a board (default), 'template' for a board template.",
    ),
  sourceBoardPublicId: z
    .string()
    .min(12)
    .optional()
    .describe(
      "Public ID of a board or template to copy lists and labels from.",
    ),
});

export class CreateBoardDto extends createZodDto(CreateBoardSchema) {}

export const BoardCreateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
});

export class BoardCreateResponseDto extends createZodDto(
  BoardCreateResponseSchema,
) {}

// ─── update ──────────────────────────────────────────────────

export const UpdateBoardSchema = z.object({
  name: z.string().min(1).optional().describe("New board name."),
  slug: slugSchema
    .optional()
    .describe("New URL slug of letters, numbers and hyphens."),
  visibility: z
    .enum(["public", "private"])
    .optional()
    .describe(
      "'public' boards can be viewed by anyone with the link, 'private' only by members.",
    ),
  favorite: z
    .boolean()
    .optional()
    .describe("Whether the board is in the current user's favourites."),
  isArchived: z
    .boolean()
    .optional()
    .describe("Archive (true) or restore (false) the board."),
});

export class UpdateBoardDto extends createZodDto(UpdateBoardSchema) {}

// Favourite-only updates return { success }; field updates return the board.
export const BoardUpdateResponseSchema = z.object({
  success: z.boolean().optional(),
  publicId: z.string().optional(),
  name: z.string().optional(),
});

export class BoardUpdateResponseDto extends createZodDto(
  BoardUpdateResponseSchema,
) {}

// ─── delete / move / slug ────────────────────────────────────

export const SuccessResponseSchema = z.object({ success: z.boolean() });

export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}

export const MoveBoardSchema = z.object({
  targetWorkspacePublicId: z
    .string()
    .min(12)
    .describe("Public ID of the workspace to move the board to."),
});

export class MoveBoardDto extends createZodDto(MoveBoardSchema) {}

export const BoardSlugAvailabilityQuerySchema = z.object({
  boardSlug: slugSchema,
});

export class BoardSlugAvailabilityQueryDto extends createZodDto(
  BoardSlugAvailabilityQuerySchema,
) {}

export const BoardSlugAvailabilitySchema = z.object({
  isReserved: z.boolean(),
});

export class BoardSlugAvailabilityDto extends createZodDto(
  BoardSlugAvailabilitySchema,
) {}
