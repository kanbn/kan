import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as customFieldRepo from "@kan/db/repository/customField.repo";
import { fieldTypes } from "@kan/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";

const fieldTypeEnum = z.enum(fieldTypes);

export const customFieldRouter = createTRPCRouter({
  // Field Definition Operations
  createFieldDefinition: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a custom field definition",
        method: "POST",
        path: "/custom-fields/definitions",
        description: "Creates a new custom field definition for a board",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(500).optional(),
        type: fieldTypeEnum,
        isRequired: z.boolean().default(false),
        boardPublicId: z.string().min(12),
      }),
    )
    .output(
      z.custom<
        Awaited<ReturnType<typeof customFieldRepo.createFieldDefinition>>
      >(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get board and verify workspace access
      const board = await boardRepo.getSimpleByPublicId(
        ctx.db,
        input.boardPublicId,
      );

      if (!board?.workspaceId || !board.id)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, board.workspaceId);

      const fieldDefinition = await customFieldRepo.createFieldDefinition(
        ctx.db,
        {
          name: input.name,
          description: input.description,
          type: input.type,
          isRequired: input.isRequired,
          boardId: board.id,
          createdBy: userId,
        },
      );

      return fieldDefinition;
    }),

  getFieldDefinitionsByBoard: protectedProcedure
    .meta({
      openapi: {
        summary: "Get custom field definitions for a board",
        method: "GET",
        path: "/custom-fields/definitions/board/{boardPublicId}",
        description: "Retrieves all custom field definitions for a board",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: z.string().min(12),
      }),
    )
    .output(
      z.custom<
        Awaited<ReturnType<typeof customFieldRepo.getFieldDefinitionsByBoardId>>
      >(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get board and verify workspace access
      const board = await boardRepo.getSimpleByPublicId(
        ctx.db,
        input.boardPublicId,
      );

      if (!board?.workspaceId || !board.id)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, board.workspaceId);

      return customFieldRepo.getFieldDefinitionsByBoardId(ctx.db, board.id);
    }),

  updateFieldDefinition: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a custom field definition",
        method: "PUT",
        path: "/custom-fields/definitions/{fieldDefinitionPublicId}",
        description: "Updates a custom field definition",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        fieldDefinitionPublicId: z.string().min(12),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(500).optional(),
        isRequired: z.boolean().optional(),
      }),
    )
    .output(
      z.custom<
        Awaited<ReturnType<typeof customFieldRepo.updateFieldDefinition>>
      >(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get field definition and verify access through board
      const fieldDefinition =
        await customFieldRepo.getFieldDefinitionByPublicId(
          ctx.db,
          input.fieldDefinitionPublicId,
        );

      if (!fieldDefinition?.boardId)
        throw new TRPCError({
          message: `Field definition with public ID ${input.fieldDefinitionPublicId} not found`,
          code: "NOT_FOUND",
        });

      const board = await boardRepo.getById(ctx.db, fieldDefinition.boardId);

      if (!board?.workspaceId)
        throw new TRPCError({
          message: `Board not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, board.workspaceId);

      const updated = await customFieldRepo.updateFieldDefinition(ctx.db, {
        publicId: input.fieldDefinitionPublicId,
        name: input.name,
        description: input.description,
        isRequired: input.isRequired,
      });

      if (!updated)
        throw new TRPCError({
          message: `Failed to update field definition`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return updated;
    }),

  deleteFieldDefinition: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a custom field definition",
        method: "DELETE",
        path: "/custom-fields/definitions/{fieldDefinitionPublicId}",
        description: "Deletes a custom field definition",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        fieldDefinitionPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get field definition and verify access through board
      const fieldDefinition =
        await customFieldRepo.getFieldDefinitionByPublicId(
          ctx.db,
          input.fieldDefinitionPublicId,
        );

      if (!fieldDefinition?.boardId)
        throw new TRPCError({
          message: `Field definition with public ID ${input.fieldDefinitionPublicId} not found`,
          code: "NOT_FOUND",
        });

      const board = await boardRepo.getById(ctx.db, fieldDefinition.boardId);

      if (!board?.workspaceId)
        throw new TRPCError({
          message: `Board not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, board.workspaceId);

      await customFieldRepo.softDeleteFieldDefinition(ctx.db, {
        publicId: input.fieldDefinitionPublicId,
        deletedBy: userId,
      });

      return { success: true };
    }),

  // Field Value Operations
  setFieldValue: protectedProcedure
    .meta({
      openapi: {
        summary: "Set a custom field value for a card",
        method: "PUT",
        path: "/custom-fields/values",
        description: "Sets or updates a custom field value for a card",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        fieldDefinitionPublicId: z.string().min(12),
        value: z.union([
          z.string(),
          z.boolean(),
          z.date(),
          z.number(),
          z.null(),
        ]),
      }),
    )
    .output(
      z.custom<Awaited<ReturnType<typeof customFieldRepo.setFieldValue>>>(),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get card and verify workspace access
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      // Get field definition and verify it belongs to the board
      const fieldDefinition =
        await customFieldRepo.getFieldDefinitionByPublicId(
          ctx.db,
          input.fieldDefinitionPublicId,
        );

      if (!fieldDefinition?.boardId)
        throw new TRPCError({
          message: `Field definition with public ID ${input.fieldDefinitionPublicId} not found`,
          code: "NOT_FOUND",
        });

      const fieldValue = await customFieldRepo.setFieldValue(ctx.db, {
        cardId: card.id,
        fieldDefinitionId: fieldDefinition.id,
        value: input.value,
        fieldType: fieldDefinition.type,
        createdBy: userId,
      });

      return fieldValue;
    }),

  getFieldValuesByCard: protectedProcedure
    .meta({
      openapi: {
        summary: "Get custom field values for a card",
        method: "GET",
        path: "/custom-fields/values/card/{cardPublicId}",
        description: "Retrieves all custom field values for a card",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
      }),
    )
    .output(
      z.custom<
        Awaited<ReturnType<typeof customFieldRepo.getFieldValuesByCardId>>
      >(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get card and verify workspace access
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      return customFieldRepo.getFieldValuesByCardId(ctx.db, card.id);
    }),

  deleteFieldValue: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a custom field value",
        method: "DELETE",
        path: "/custom-fields/values",
        description: "Deletes a custom field value for a card",
        tags: ["Custom Fields"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        fieldDefinitionPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Get card and verify workspace access
      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      // Get field definition
      const fieldDefinition =
        await customFieldRepo.getFieldDefinitionByPublicId(
          ctx.db,
          input.fieldDefinitionPublicId,
        );

      if (!fieldDefinition?.boardId)
        throw new TRPCError({
          message: `Field definition with public ID ${input.fieldDefinitionPublicId} not found`,
          code: "NOT_FOUND",
        });

      await customFieldRepo.deleteFieldValue(ctx.db, {
        cardId: card.id,
        fieldDefinitionId: fieldDefinition.id,
        deletedBy: userId,
      });

      return { success: true };
    }),
});
