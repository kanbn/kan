import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as customFieldRepo from "@kan/db/repository/custom-field.repo";

import {
  customFieldColourCodeSchema as colourCodeSchema,
  customFieldDefinitionSchema as definitionSchema,
  customFieldDescriptionSchema as descriptionSchema,
  customFieldNameSchema as nameSchema,
  customFieldOptionSchema as optionSchema,
  customFieldPlaceholderSchema as placeholderSchema,
  customFieldPublicIdSchema as publicIdSchema,
  customFieldValueInputSchema as valueInputSchema,
  customFieldValueSchema as valueSchema,
} from "../schemas";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertCanEdit, assertPermission } from "../utils/permissions";

const requireUserId = (userId: string | undefined) => {
  if (!userId)
    throw new TRPCError({
      message: "User not authenticated",
      code: "UNAUTHORIZED",
    });
  return userId;
};

const throwRepositoryError = (error: unknown): never => {
  if (!(error instanceof customFieldRepo.CustomFieldRepositoryError))
    throw error;

  const notFoundCodes = new Set([
    "BOARD_NOT_FOUND",
    "CARD_NOT_FOUND",
    "FIELD_NOT_FOUND",
    "OPTION_NOT_FOUND",
  ]);
  throw new TRPCError({
    message: error.message,
    code: notFoundCodes.has(error.code) ? "NOT_FOUND" : "BAD_REQUEST",
    cause: error,
  });
};

const mapDefinition = (definition: {
  publicId: string;
  name: string;
  description: string | null;
  placeholder: string | null;
  type: "text" | "number" | "date" | "checkbox" | "select";
  position: number;
  showOnCard: boolean;
  options: {
    publicId: string;
    name: string;
    colourCode: string | null;
    position: number;
    deletedAt?: Date | null;
  }[];
  defaultValue: z.infer<typeof valueInputSchema> | null;
}) => ({
  ...definition,
  options: definition.options.map(({ deletedAt, ...option }) => ({
    ...option,
    isArchived: !!deletedAt,
  })),
});

export const customFieldRouter = createTRPCRouter({
  definitionsByBoard: protectedProcedure
    .meta({
      openapi: {
        summary: "List custom field definitions",
        method: "GET",
        path: "/boards/{boardPublicId}/custom-fields",
        description: "Lists custom field definitions for a board",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(z.object({ boardPublicId: publicIdSchema }))
    .output(z.array(definitionSchema))
    .query(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      if (!board)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, board.workspaceId, "board:view");

      const definitions = await customFieldRepo.listDefinitionsByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      return definitions.map(mapDefinition);
    }),

  createDefinition: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a custom field definition",
        method: "POST",
        path: "/boards/{boardPublicId}/custom-fields",
        description: "Creates a custom field definition on a board",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: publicIdSchema,
        name: nameSchema,
        description: descriptionSchema.nullable().optional(),
        placeholder: placeholderSchema.nullable().optional(),
        type: z.enum(["text", "number", "date", "checkbox", "select"]),
        showOnCard: z.boolean().default(true),
        options: z
          .array(
            z.object({
              name: nameSchema,
              colourCode: colourCodeSchema.optional(),
            }),
          )
          .max(customFieldRepo.MAX_CUSTOM_FIELD_OPTIONS)
          .optional(),
      }),
    )
    .output(definitionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      if (!board)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, board.workspaceId, "board:edit");

      try {
        const definition = await customFieldRepo.createDefinition(ctx.db, {
          ...input,
          actorUserId: userId,
        });
        return mapDefinition(definition);
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  updateDefinition: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a custom field definition",
        method: "PUT",
        path: "/custom-fields/{fieldPublicId}",
        description: "Updates a custom field definition",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z
        .object({
          fieldPublicId: publicIdSchema,
          name: nameSchema.optional(),
          description: descriptionSchema.nullable().optional(),
          placeholder: placeholderSchema.nullable().optional(),
          showOnCard: z.boolean().optional(),
          defaultValue: valueInputSchema.nullable().optional(),
        })
        .refine(
          ({ name, description, placeholder, showOnCard, defaultValue }) =>
            name !== undefined ||
            description !== undefined ||
            placeholder !== undefined ||
            showOnCard !== undefined ||
            defaultValue !== undefined,
          { message: "At least one field must be updated" },
        ),
    )
    .output(definitionSchema.omit({ options: true }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const field = await customFieldRepo.getWorkspaceAndDefinitionIdByPublicId(
        ctx.db,
        input.fieldPublicId,
      );
      if (!field)
        throw new TRPCError({
          message: `Custom field ${input.fieldPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, field.workspaceId, "board:edit");

      try {
        return await customFieldRepo.updateDefinition(ctx.db, {
          ...input,
          actorUserId: userId,
        });
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  archiveDefinition: protectedProcedure
    .meta({
      openapi: {
        summary: "Archive a custom field definition",
        method: "DELETE",
        path: "/custom-fields/{fieldPublicId}",
        description: "Archives a custom field definition and preserves values",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(z.object({ fieldPublicId: publicIdSchema }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const field = await customFieldRepo.getWorkspaceAndDefinitionIdByPublicId(
        ctx.db,
        input.fieldPublicId,
      );
      if (!field)
        throw new TRPCError({
          message: `Custom field ${input.fieldPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, field.workspaceId, "board:edit");

      try {
        await customFieldRepo.archiveDefinition(ctx.db, {
          ...input,
          actorUserId: userId,
        });
        return { success: true };
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  reorderDefinitions: protectedProcedure
    .meta({
      openapi: {
        summary: "Reorder custom field definitions",
        method: "PUT",
        path: "/boards/{boardPublicId}/custom-fields/order",
        description: "Reorders all active custom field definitions on a board",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: publicIdSchema,
        fieldPublicIds: z
          .array(publicIdSchema)
          .max(customFieldRepo.MAX_CUSTOM_FIELDS_PER_BOARD),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );
      if (!board)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, board.workspaceId, "board:edit");

      try {
        return await customFieldRepo.reorderDefinitions(ctx.db, {
          ...input,
          actorUserId: userId,
        });
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  createOption: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a custom field option",
        method: "POST",
        path: "/custom-fields/{fieldPublicId}/options",
        description: "Adds an option to a select custom field",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        fieldPublicId: publicIdSchema,
        name: nameSchema,
        colourCode: colourCodeSchema.optional(),
      }),
    )
    .output(optionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const field = await customFieldRepo.getWorkspaceAndDefinitionIdByPublicId(
        ctx.db,
        input.fieldPublicId,
      );
      if (!field)
        throw new TRPCError({
          message: `Custom field ${input.fieldPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, field.workspaceId, "board:edit");

      try {
        const option = await customFieldRepo.createOption(ctx.db, {
          ...input,
          actorUserId: userId,
        });
        return { ...option, isArchived: false };
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  updateOption: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a custom field option",
        method: "PUT",
        path: "/custom-field-options/{optionPublicId}",
        description: "Updates a custom field option",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z
        .object({
          optionPublicId: publicIdSchema,
          name: nameSchema.optional(),
          colourCode: colourCodeSchema.optional(),
        })
        .refine(
          ({ name, colourCode }) =>
            name !== undefined || colourCode !== undefined,
          { message: "At least one option field must be updated" },
        ),
    )
    .output(optionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const option = await customFieldRepo.getWorkspaceAndOptionIdByPublicId(
        ctx.db,
        input.optionPublicId,
      );
      if (!option)
        throw new TRPCError({
          message: `Custom field option ${input.optionPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, option.workspaceId, "board:edit");

      try {
        const updated = await customFieldRepo.updateOption(ctx.db, {
          ...input,
          actorUserId: userId,
        });
        return { ...updated, isArchived: false };
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  archiveOption: protectedProcedure
    .meta({
      openapi: {
        summary: "Archive a custom field option",
        method: "DELETE",
        path: "/custom-field-options/{optionPublicId}",
        description: "Archives a custom field option and preserves values",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(z.object({ optionPublicId: publicIdSchema }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const option = await customFieldRepo.getWorkspaceAndOptionIdByPublicId(
        ctx.db,
        input.optionPublicId,
      );
      if (!option)
        throw new TRPCError({
          message: `Custom field option ${input.optionPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, option.workspaceId, "board:edit");

      try {
        await customFieldRepo.archiveOption(ctx.db, {
          ...input,
          actorUserId: userId,
        });
        return { success: true };
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  reorderOptions: protectedProcedure
    .meta({
      openapi: {
        summary: "Reorder custom field options",
        method: "PUT",
        path: "/custom-fields/{fieldPublicId}/options/order",
        description: "Reorders all active options of a select custom field",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        fieldPublicId: publicIdSchema,
        optionPublicIds: z
          .array(publicIdSchema)
          .max(customFieldRepo.MAX_CUSTOM_FIELD_OPTIONS),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const field = await customFieldRepo.getWorkspaceAndDefinitionIdByPublicId(
        ctx.db,
        input.fieldPublicId,
      );
      if (!field)
        throw new TRPCError({
          message: `Custom field ${input.fieldPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, field.workspaceId, "board:edit");

      try {
        return await customFieldRepo.reorderOptions(ctx.db, {
          ...input,
          actorUserId: userId,
        });
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  valuesByCard: protectedProcedure
    .meta({
      openapi: {
        summary: "List custom field values",
        method: "GET",
        path: "/cards/{cardPublicId}/custom-fields",
        description: "Lists populated custom field values on a card",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(z.object({ cardPublicId: publicIdSchema }))
    .output(z.array(valueSchema))
    .query(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );
      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, card.workspaceId, "card:view");

      try {
        return await customFieldRepo.listValuesByCardPublicId(
          ctx.db,
          input.cardPublicId,
        );
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  setValue: protectedProcedure
    .meta({
      openapi: {
        summary: "Set a custom field value",
        method: "PUT",
        path: "/cards/{cardPublicId}/custom-fields/{fieldPublicId}",
        description: "Sets a custom field value on a card",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: publicIdSchema,
        fieldPublicId: publicIdSchema,
        value: valueInputSchema,
      }),
    )
    .output(valueSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );
      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertCanEdit(
        ctx.db,
        userId,
        card.workspaceId,
        "card:edit",
        card.createdBy,
      );

      try {
        return await customFieldRepo.setCardValue(ctx.db, {
          ...input,
          actorUserId: userId,
        });
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),

  clearValue: protectedProcedure
    .meta({
      openapi: {
        summary: "Clear a custom field value",
        method: "DELETE",
        path: "/cards/{cardPublicId}/custom-fields/{fieldPublicId}",
        description: "Clears a custom field value from a card",
        tags: ["Custom fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: publicIdSchema,
        fieldPublicId: publicIdSchema,
      }),
    )
    .output(z.object({ cleared: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = requireUserId(ctx.user?.id);
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );
      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertCanEdit(
        ctx.db,
        userId,
        card.workspaceId,
        "card:edit",
        card.createdBy,
      );

      try {
        return await customFieldRepo.clearCardValue(ctx.db, input);
      } catch (error) {
        return throwRepositoryError(error);
      }
    }),
});
