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
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/),
  workspacePublicId: z.string().min(12).optional(),
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
  name: z.string().min(1).max(64),
  description: z.string().max(280).optional(),
  // NewWorkspaceForm submits slug as "" when the user leaves the URL field
  // empty, so the server must accept the empty string too and fall back to
  // the generated public id below.
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
    .optional()
    .or(z.string().max(0)),
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
  name: z.string().min(3).max(64).optional(),
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
    .optional(),
  description: z.string().min(3).max(280).optional(),
  showEmailsToMembers: z.boolean().optional(),
  weekStartDay: z.union([z.literal(0), z.literal(1), z.literal(6)]).optional(),
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
  query: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
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
