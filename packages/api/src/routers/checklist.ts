import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";

import {
  createNextApiContext,
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";

const checklistSchema = z.object({
  publicId: z.string().length(12),
  name: z.string().min(1).max(255),
});

const checklistItemSchema = z.object({
  publicId: z.string().length(12),
  title: z.string().min(1).max(500),
  completed: z.boolean(),
});

export const checklistRouter = createTRPCRouter({
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Add a checklist to a card",
        method: "POST",
        path: "/cards/{cardPublicId}/checklists",
        description: "Adds a checklist to a card",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().length(12),
        name: z.string().min(1).max(255),
      }),
    )
    .output(checklistSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

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

      const newChecklist = await checklistRepo.create(ctx.db, {
        name: input.name,
        createdBy: userId,
        cardId: card.id,
      });

      if (!newChecklist?.id)
        throw new TRPCError({
          message: `Failed to create checklist`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.checklist.added",
        cardId: card.id,
        toTitle: newChecklist.name,
        createdBy: userId,
      });

      return newChecklist;
    }),
  update: protectedProcedure
    .input(
      z.object({
        checklistPublicId: z.string().length(12),
        name: z.string().min(1).max(255),
      }),
    )
    .output(z.object({ publicId: z.string().length(12), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const checklist = await checklistRepo.getChecklistByPublicId(
        ctx.db,
        input.checklistPublicId,
      );
      if (!checklist)
        throw new TRPCError({
          message: `Checklist with public ID ${input.checklistPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(
        ctx.db,
        userId,
        checklist.card.list.board.workspace.id,
      );

      const previousName = checklist.name;

      const updated = await checklistRepo.updateChecklistById(ctx.db, {
        id: checklist.id,
        name: input.name,
      });

      if (!updated)
        throw new TRPCError({
          message: `Failed to update checklist`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.checklist.renamed",
        cardId: checklist.cardId,
        fromTitle: previousName,
        toTitle: updated.name,
        createdBy: userId,
      });

      return updated;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a checklist",
        method: "DELETE",
        path: "/checklists/{checklistPublicId}",
        description: "Deletes a checklist by its public ID",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(z.object({ checklistPublicId: z.string().length(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const checklist = await checklistRepo.getChecklistByPublicId(
        ctx.db,
        input.checklistPublicId,
      );
      if (!checklist)
        throw new TRPCError({
          message: `Checklist with public ID ${input.checklistPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(
        ctx.db,
        userId,
        checklist.card.list.board.workspace.id,
      );

      await checklistRepo.softDeleteAllItemsByChecklistId(ctx.db, {
        checklistId: checklist.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      const deleted = await checklistRepo.softDeleteById(ctx.db, {
        id: checklist.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      if (!deleted)
        throw new TRPCError({
          message: `Failed to delete checklist`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.checklist.deleted",
        cardId: checklist.cardId,
        fromTitle: checklist.name,
        createdBy: userId,
      });

      return { success: true };
    }),
  createItem: protectedProcedure
    .meta({
      openapi: {
        summary: "Add an item to a checklist",
        method: "POST",
        path: "/checklists/{checklistPublicId}/items",
        description: "Adds an item to a checklist",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        checklistPublicId: z.string().length(12),
        title: z.string().min(1).max(500),
      }),
    )
    .output(checklistItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const checklist = await checklistRepo.getChecklistByPublicId(
        ctx.db,
        input.checklistPublicId,
      );

      if (!checklist)
        throw new TRPCError({
          message: `Checklist with public ID ${input.checklistPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(
        ctx.db,
        userId,
        checklist.card.list.board.workspace.id,
      );

      const newChecklistItem = await checklistRepo.createItem(ctx.db, {
        title: input.title,
        createdBy: userId,
        checklistId: checklist.id,
      });

      if (!newChecklistItem?.id)
        throw new TRPCError({
          message: `Failed to create checklist item`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.checklist.item.added",
        cardId: checklist.cardId,
        toTitle: newChecklistItem.title,
        createdBy: userId,
      });

      return newChecklistItem;
    }),
  updateItem: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a checklist item",
        method: "PUT",
        path: "/checklists/items/{checklistItemPublicId}",
        description: "Updates a checklist item (title/completed)",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        checklistItemPublicId: z.string().length(12),
        title: z.string().min(1).max(500).optional(),
        completed: z.boolean().optional(),
      }),
    )
    .output(checklistItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const item = await checklistRepo.getChecklistItemByPublicIdWithChecklist(
        ctx.db,
        input.checklistItemPublicId,
      );

      if (!item)
        throw new TRPCError({
          message: `Checklist item with public ID ${input.checklistItemPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(
        ctx.db,
        userId,
        item.checklist.card.list.board.workspace.id,
      );

      const previousTitle = item.title;

      const updated = await checklistRepo.updateItemById(ctx.db, {
        id: item.id,
        title: input.title,
        completed: input.completed,
      });

      if (!updated)
        throw new TRPCError({
          message: `Failed to update checklist item`,
          code: "INTERNAL_SERVER_ERROR",
        });

      // Log completion toggle
      if (input.completed !== undefined) {
        await cardActivityRepo.create(ctx.db, {
          type: input.completed
            ? "card.updated.checklist.item.completed"
            : "card.updated.checklist.item.uncompleted",
          cardId: item.checklist.cardId,
          toTitle: updated.title,
          createdBy: userId,
        });
      }

      // Log title change
      if (input.title !== undefined && input.title !== previousTitle) {
        await cardActivityRepo.create(ctx.db, {
          type: "card.updated.checklist.item.updated",
          cardId: item.checklist.cardId,
          fromTitle: previousTitle,
          toTitle: updated.title,
          createdBy: userId,
        });
      }

      return updated;
    }),
  reorderItem: protectedProcedure
    .meta({
      openapi: {
        summary: "Reorder a checklist item",
        method: "PUT",
        path: "/checklists/items/{checklistItemPublicId}/reorder",
        description: "Reorders a checklist item",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(
      z.object({
        checklistItemPublicId: z.string().length(12),
        index: z.number().int().min(0),
      }),
    )
    .output(checklistItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const item = await checklistRepo.getChecklistItemByPublicIdWithChecklist(
        ctx.db,
        input.checklistItemPublicId,
      );

      if (!item)
        throw new TRPCError({
          message: `Checklist item with public ID ${input.checklistItemPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(
        ctx.db,
        userId,
        item.checklist.card.list.board.workspace.id,
      );

      const reordered = await checklistRepo.reorderItem(ctx.db, {
        itemId: item.id,
        newIndex: input.index,
      });

      if (!reordered)
        throw new TRPCError({
          message: `Failed to reorder checklist item`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return reordered;
    }),
  deleteItem: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a checklist item",
        method: "DELETE",
        path: "/checklists/items/{checklistItemPublicId}",
        description: "Deletes a checklist item",
        tags: ["Cards"],
        protect: true,
      },
    })
    .input(z.object({ checklistItemPublicId: z.string().length(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const item = await checklistRepo.getChecklistItemByPublicIdWithChecklist(
        ctx.db,
        input.checklistItemPublicId,
      );
      if (!item)
        throw new TRPCError({
          message: `Checklist item with public ID ${input.checklistItemPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(
        ctx.db,
        userId,
        item.checklist.card.list.board.workspace.id,
      );

      const deleted = await checklistRepo.softDeleteItemById(ctx.db, {
        id: item.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      if (!deleted)
        throw new TRPCError({
          message: `Failed to delete item`,
          code: "INTERNAL_SERVER_ERROR",
        });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.checklist.item.deleted",
        cardId: item.checklist.cardId,
        fromTitle: item.title,
        createdBy: userId,
      });

      return { success: true };
    }),
});
