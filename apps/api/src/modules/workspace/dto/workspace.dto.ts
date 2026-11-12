import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PlanSchema = z.enum(["free", "team", "pro", "enterprise"]);

export const WorkspaceListItemSchema = z.object({
  role: z.string(),
  workspace: z.object({
    publicId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    slug: z.string(),
    plan: PlanSchema,
    weekStartDay: z.number().nullable(),
    cardPrefix: z.string(),
    deletedAt: z.iso.datetime().nullable(),
  }),
});

export class WorkspaceListItemDto extends createZodDto(
  WorkspaceListItemSchema,
) {}

export const CheckSlugAvailabilityQuerySchema = z.object({
  workspaceSlug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
    .describe("The slug to check."),
  workspacePublicId: z
    .string()
    .min(12)
    .optional()
    .describe(
      "When renaming, the public ID of the workspace being renamed, so its own slug counts as available.",
    ),
});

export class CheckSlugAvailabilityQueryDto extends createZodDto(
  CheckSlugAvailabilityQuerySchema,
) {}

export const CheckSlugAvailabilityResponseSchema = z.object({
  isAvailable: z.boolean(),
  isReserved: z.boolean(),
});

export class CheckSlugAvailabilityResponseDto extends createZodDto(
  CheckSlugAvailabilityResponseSchema,
) {}

const WorkspaceMemberDetailSchema = z.object({
  publicId: z.string(),
  email: z.string().optional(),
  role: z.string(),
  status: z.string(),
  createdAt: z.iso.datetime(),
  user: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
      email: z.string().optional(),
      image: z.string().nullable(),
    })
    .nullable(),
});

const WorkspaceSubscriptionSchema = z.object({
  plan: z.string(),
  status: z.string(),
  seats: z.number().nullable(),
  unlimitedSeats: z.boolean().nullable(),
  partnerTier: z.number().nullable(),
  periodStart: z.iso.datetime().nullable(),
  periodEnd: z.iso.datetime().nullable(),
});

export const WorkspaceDetailResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  showEmailsToMembers: z.boolean().nullable(),
  weekStartDay: z.number().nullable(),
  members: z.array(WorkspaceMemberDetailSchema),
  subscriptions: z.array(WorkspaceSubscriptionSchema),
});

export class WorkspaceDetailResponseDto extends createZodDto(
  WorkspaceDetailResponseSchema,
) {}

export const WorkspaceWithBoardsResponseSchema = z.object({
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

export class WorkspaceWithBoardsResponseDto extends createZodDto(
  WorkspaceWithBoardsResponseSchema,
) {}

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(64).describe("Workspace name."),
  description: z
    .string()
    .max(280)
    .optional()
    .describe("Short description of the workspace."),
  // NewWorkspaceForm submits slug as "" when the user leaves the URL field
  // empty, so the server must accept the empty string too and fall back to
  // the generated public id below.
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
    .optional()
    .or(z.string().max(0))
    .describe(
      "URL slug of letters, numbers and hyphens. Generated if omitted or empty.",
    ),
});

export class CreateWorkspaceDto extends createZodDto(CreateWorkspaceSchema) {}

export const WorkspaceCreateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  plan: PlanSchema,
  cardPrefix: z.string(),
});

export class WorkspaceCreateResponseDto extends createZodDto(
  WorkspaceCreateResponseSchema,
) {}

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(3).max(64).optional().describe("New workspace name."),
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
    .optional()
    .describe("New URL slug of letters, numbers and hyphens."),
  description: z
    .string()
    .min(3)
    .max(280)
    .optional()
    .describe("New workspace description."),
  showEmailsToMembers: z
    .boolean()
    .optional()
    .describe("Whether members can see each other's email addresses."),
  weekStartDay: z
    .union([z.literal(0), z.literal(1), z.literal(6)])
    .optional()
    .describe("First day of the week: 0 Sunday, 1 Monday or 6 Saturday."),
});

export class UpdateWorkspaceDto extends createZodDto(UpdateWorkspaceSchema) {}

export const WorkspaceUpdateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  plan: PlanSchema,
  showEmailsToMembers: z.boolean().nullable(),
  weekStartDay: z.number().nullable(),
});

export class WorkspaceUpdateResponseDto extends createZodDto(
  WorkspaceUpdateResponseSchema,
) {}

export const WorkspaceDeleteResponseSchema = z.object({
  success: z.boolean(),
});

export class WorkspaceDeleteResponseDto extends createZodDto(
  WorkspaceDeleteResponseSchema,
) {}

export const SearchQuerySchema = z.object({
  query: z
    .string()
    .min(1)
    .max(100)
    .describe("Text to search for in board and card titles."),
  limit: z.coerce
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(20)
    .describe("Maximum number of results."),
});

export class SearchQueryDto extends createZodDto(SearchQuerySchema) {}

export const SearchBoardResultSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  updatedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  type: z.literal("board"),
});

export class SearchBoardResultDto extends createZodDto(
  SearchBoardResultSchema,
) {}

export const SearchCardResultSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  boardPublicId: z.string(),
  boardName: z.string(),
  listName: z.string(),
  cardNumber: z.number().nullable(),
  updatedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  type: z.literal("card"),
});

export class SearchCardResultDto extends createZodDto(SearchCardResultSchema) {}

// `createZodDto` needs a single concrete object shape to extend as a class,
// so the discriminated union itself (used for typing only) stays a plain
// schema/type — the two branches above are the ones Swagger documents via
// `@ApiExtraModels` + a manual `oneOf` on the controller method.
export const SearchResultSchema = z.discriminatedUnion("type", [
  SearchBoardResultSchema,
  SearchCardResultSchema,
]);

// Same reasoning as the discriminated union above: `createZodDto` can't
// extend a class from a bare boolean schema, so this stays a plain schema
// and the controller documents it with a manual `schema: { type: "boolean" }`.
export const HasAvailablePartnerSlotResponseSchema = z.boolean();
