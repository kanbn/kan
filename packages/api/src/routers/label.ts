import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as labelRepo from "@kan/db/repository/label.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const labelSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  colourCode: z.string().nullable(),
});

export const labelRouter = createTRPCRouter({
  byPublicId: protectedProcedure
    .meta({
      openapi: {
        summary: "Get a label by public ID",
        method: "GET",
        path: "/labels/{labelPublicId}",
        description: "Retrieves a label by its public ID",
        tags: ["Labels"],
        protect: true,
      },
    })
    .input(z.object({ labelPublicId: z.string().min(12) }))
    .output(labelSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const label = await labelRepo.getWorkspaceAndLabelIdByLabelPublicId(
        ctx.db,
        input.labelPublicId,
      );

      if (!label)
        throw new TRPCError({
          message: `Label with public ID ${input.labelPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, label.workspaceId, "board:view");

      const result = await labelRepo.getByPublicId(ctx.db, input.labelPublicId);

      if (!result)
        throw new TRPCError({
          message: `Label with public ID ${input.labelPublicId} not found`,
          code: "NOT_FOUND",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        colourCode: result.colourCode,
      };
    }),
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a label",
        method: "POST",
        path: "/labels",
        description: "Creates a new label",
        tags: ["Labels"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1).max(36),
        boardPublicId: z.string().min(12),
        colourCode: z.string().length(7),
      }),
    )
    .output(labelSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

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

      const result = await labelRepo.create(ctx.db, {
        name: input.name,
        colourCode: input.colourCode,
        createdBy: userId,
        boardId: board.id,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create label`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        colourCode: result.colourCode,
      };
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a label",
        method: "PUT",
        path: "/labels/{labelPublicId}",
        description: "Updates a label by its public ID",
        tags: ["Labels"],
        protect: true,
      },
    })
    .input(
      z.object({
        labelPublicId: z.string().min(12),
        name: z.string().min(1).max(36),
        colourCode: z.string().length(7),
      }),
    )
    .output(labelSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const label = await labelRepo.getWorkspaceAndLabelIdByLabelPublicId(
        ctx.db,
        input.labelPublicId,
      );

      if (!label)
        throw new TRPCError({
          message: `Label with public ID ${input.labelPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, label.workspaceId, "board:edit");

      const result = await labelRepo.update(ctx.db, input);

      if (!result)
        throw new TRPCError({
          message: `Failed to update label`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return {
        publicId: result.publicId,
        name: result.name,
        colourCode: result.colourCode,
      };
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a label",
        method: "DELETE",
        path: "/labels/{labelPublicId}",
        description: "Deletes a label by its public ID",
        tags: ["Labels"],
        protect: true,
      },
    })
    .input(z.object({ labelPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const label = await labelRepo.getWorkspaceAndLabelIdByLabelPublicId(
        ctx.db,
        input.labelPublicId,
      );

      if (!label)
        throw new TRPCError({
          message: `Label with public ID ${input.labelPublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, label.workspaceId, "board:edit");

      await cardRepo.hardDeleteAllCardLabelRelationships(ctx.db, label.id);

      await labelRepo.softDelete(ctx.db, {
        labelId: label.id,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      return { success: true };
    }),
});
