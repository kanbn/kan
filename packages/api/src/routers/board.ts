import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { colours } from "@kan/shared/constants";
import {
  convertDueDateFiltersToRanges,
  generateAvatarUrl,
  generateSlug,
  generateUID,
} from "@kan/shared/utils";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { assertCanDelete, assertCanEdit, assertPermission } from "../utils/permissions";

export const boardRouter = createTRPCRouter({
  all: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces/{workspacePublicId}/boards",
        summary: "Get all boards",
        description: "Retrieves all boards for a given workspace",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        type: z.enum(["regular", "template"]).optional(),
      }),
    )
    .output(
      z.custom<Awaited<ReturnType<typeof boardRepo.getAllByWorkspaceId>>>(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "board:view");

      const result = boardRepo.getAllByWorkspaceId(
        ctx.db,
        workspace.id,
        userId,
        { type: input.type }
      );

      return result;
    }),
  byId: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/boards/{boardPublicId}",
        summary: "Get board by public ID",
        description: "Retrieves a board by its public ID",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        members: z.array(z.string().min(12)).optional(),
        labels: z.array(z.string().min(12)).optional(),
        lists: z.array(z.string().min(12)).optional(),
        dueDateFilters: z
          .array(
            z.enum([
              "overdue",
              "today",
              "tomorrow",
              "next-week",
              "next-month",
              "no-due-date",
            ]),
          )
          .optional(),
        type: z.enum(["regular", "template"]).optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof boardRepo.getByPublicId>>>())
    .query(async ({ ctx, input }) => {
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

      await assertPermission(ctx.db, userId, board.workspaceId, "board:view");

      // Convert semantic string filters to date ranges expected by the repo
      const dueDateFilters = input.dueDateFilters
        ? convertDueDateFiltersToRanges(input.dueDateFilters)
        : [];

      const result = await boardRepo.getByPublicId(
        ctx.db,
        input.boardPublicId,
        userId,
        {
          members: input.members ?? [],
          labels: input.labels ?? [],
          lists: input.lists ?? [],
          dueDate: dueDateFilters,
          type: input.type,
        },
      );

      if (!result) {
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });
      }

      // Generate presigned URLs for workspace member avatars
      const workspaceWithAvatarUrls = result.workspace
        ? {
            ...result.workspace,
            members: await Promise.all(
              result.workspace.members.map(async (member) => {
                if (!member.user?.image) {
                  return member;
                }

                const avatarUrl = await generateAvatarUrl(member.user.image);
                return {
                  ...member,
                  user: {
                    ...member.user,
                    image: avatarUrl,
                  },
                };
              }),
            ),
          }
        : result.workspace;

      // Generate presigned URLs for card member avatars
      const listsWithAvatarUrls = await Promise.all(
        result.lists.map(async (list) => ({
          ...list,
          cards: await Promise.all(
            list.cards.map(async (card) => ({
              ...card,
              members: await Promise.all(
                card.members.map(async (member) => {
                  if (!member.user?.image) return member;
                  const avatarUrl = await generateAvatarUrl(member.user.image);
                  return {
                    ...member,
                    user: { ...member.user, image: avatarUrl },
                  };
                }),
              ),
            })),
          ),
        })),
      );

      return {
        ...result,
        lists: listsWithAvatarUrls,
        workspace: workspaceWithAvatarUrls,
      };
    }),
  bySlug: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/workspaces/{workspaceSlug}/boards/{boardSlug}",
        summary: "Get board by slug",
        description:
          "Retrieves a board by its slug within a specific workspace",
        tags: ["Boards"],
        protect: false,
      },
    })
    .input(
      z.object({
        workspaceSlug: z
          .string()
          .min(3)
          .max(64)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/),
        boardSlug: z
          .string()
          .min(3)
          .max(24)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/),
        members: z.array(z.string().min(12)).optional(),
        labels: z.array(z.string().min(12)).optional(),
        lists: z.array(z.string().min(12)).optional(),
        dueDateFilters: z
          .array(
            z.enum([
              "overdue",
              "today",
              "tomorrow",
              "next-week",
              "next-month",
              "no-due-date",
            ]),
          )
          .optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof boardRepo.getBySlug>>>())
    .query(async ({ ctx, input }) => {
      const workspace = await workspaceRepo.getBySlugWithBoards(
        ctx.db,
        input.workspaceSlug,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with slug ${input.workspaceSlug} not found`,
          code: "NOT_FOUND",
        });

      // Convert semantic string filters to date ranges expected by the repo
      const dueDateFilters = input.dueDateFilters
        ? convertDueDateFiltersToRanges(input.dueDateFilters)
        : [];

      const result = await boardRepo.getBySlug(
        ctx.db,
        input.boardSlug,
        workspace.id,
        {
          members: input.members ?? [],
          labels: input.labels ?? [],
          lists: input.lists ?? [],
          dueDate: dueDateFilters,
        },
      );

      return result;
    }),
  create: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/workspaces/{workspacePublicId}/boards",
        summary: "Create board",
        description: "Creates a new board for a given workspace",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1).max(100),
        workspacePublicId: z.string().min(12),
        lists: z.array(z.string().min(1)),
        labels: z.array(z.string().min(1)),
        type: z.enum(["regular", "template"]).optional(),
        sourceBoardPublicId: z.string().min(12).optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof boardRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "board:create");

      // If sourceBoardPublicId is provided, clone the source board
      if (input.sourceBoardPublicId) {
        // First get the source board info (ID and type)
        const sourceBoardInfo = await boardRepo.getIdByPublicId(
          ctx.db,
          input.sourceBoardPublicId,
        );

        if (!sourceBoardInfo)
          throw new TRPCError({
            message: `Source board with public ID ${input.sourceBoardPublicId} not found`,
            code: "NOT_FOUND",
          });

        // Get the full board data with the correct type
        const sourceBoard = await boardRepo.getByPublicId(
          ctx.db,
          input.sourceBoardPublicId,
          userId,
          {
            members: [],
            labels: [],
            lists: [],
            dueDate: [],
            type: sourceBoardInfo.type,
          },
        );

        if (!sourceBoard)
          throw new TRPCError({
            message: `Source board with public ID ${input.sourceBoardPublicId} not found`,
            code: "NOT_FOUND",
          });

        // Verify the source board belongs to the same workspace
        const sourceWorkspace = await workspaceRepo.getByPublicId(
          ctx.db,
          sourceBoard.workspace.publicId,
        );

        if (!sourceWorkspace || sourceWorkspace.id !== workspace.id)
          throw new TRPCError({
            message: `Source board does not belong to this workspace`,
            code: "FORBIDDEN",
          });

        let slug = generateSlug(input.name);

        const isSlugUnique = await boardRepo.isSlugUnique(ctx.db, {
          slug,
          workspaceId: workspace.id,
        });

        if (!isSlugUnique || input.type === "template")
          slug = `${slug}-${generateUID()}`;

        const result = await boardRepo.createFromSnapshot(ctx.db, {
          source: sourceBoard,
          workspaceId: workspace.id,
          createdBy: userId,
          slug,
          name: input.name,
          type: input.type ?? "regular",
          sourceBoardId: sourceBoardInfo.id,
        });

        return result;
      }

      // Otherwise, create a new board with provided lists and labels
      let slug = generateSlug(input.name);

      const isSlugUnique = await boardRepo.isSlugUnique(ctx.db, {
        slug,
        workspaceId: workspace.id,
      });

      if (!isSlugUnique || input.type === "template")
        slug = `${slug}-${generateUID()}`;

      const result = await boardRepo.create(ctx.db, {
        publicId: generateUID(),
        slug,
        name: input.name,
        createdBy: userId,
        workspaceId: workspace.id,
        type: input.type,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create board`,
          code: "INTERNAL_SERVER_ERROR",
        });

      if (input.lists.length) {
        const listInputs = input.lists.map((list, index) => ({
          publicId: generateUID(),
          name: list,
          boardId: result.id,
          createdBy: userId,
          index,
        }));

        await listRepo.bulkCreate(ctx.db, listInputs);
      }

      if (input.labels.length) {
        const labelInputs = input.labels.map((label, index) => ({
          publicId: generateUID(),
          name: label,
          boardId: result.id,
          createdBy: userId,
          colourCode: colours[index % colours.length]?.code ?? "#0d9488",
        }));

        await labelRepo.bulkCreate(ctx.db, labelInputs);
      }

      return result;
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/boards/{boardPublicId}",
        summary: "Update board",
        description: "Updates a board by its public ID",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        name: z.string().min(1).optional(),
        slug: z
          .string()
          .min(3)
          .max(60)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
          .optional(),
        visibility: z.enum(["public", "private"]).optional(),
        favorite: z.boolean().optional()
      }),
    )
    .output(z.object({ success: z.boolean() }).or(z.custom<Awaited<ReturnType<typeof boardRepo.update>>>()))
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

      await assertCanEdit(
        ctx.db,
        userId,
        board.workspaceId,
        "board:edit",
        board.createdBy ?? null,
      );

      // Handle favorite toggle separately
      if (input.favorite !== undefined) {
        if (input.favorite) {
          await boardRepo.addUserFavorite(ctx.db, userId, board.id);
        } else {
          await boardRepo.removeUserFavorite(ctx.db, userId, board.id);
        }
      }

      // Handle other updates (name, slug, visibility)
      const hasOtherUpdates = input.name || input.slug || input.visibility !== undefined;

      if (!hasOtherUpdates) {
        // Only favorite was updated, return success
        return { success: true };
      }

      if (input.slug) {
        const isBoardSlugAvailable = await boardRepo.isBoardSlugAvailable(
          ctx.db,
          input.slug,
          board.workspaceId,
        );

        if (!isBoardSlugAvailable) {
          throw new TRPCError({
            message: `Board slug ${input.slug} is not available`,
            code: "BAD_REQUEST",
          });
        }
      }

      const result = await boardRepo.update(ctx.db, {
        name: input.name,
        slug: input.slug,
        boardPublicId: input.boardPublicId,
        visibility: input.visibility,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to update board`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return result;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/boards/{boardPublicId}",
        summary: "Delete board",
        description: "Deletes a board by its public ID",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: z.string().min(12),
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

      const board = await boardRepo.getWithListIdsByPublicId(
        ctx.db,
        input.boardPublicId,
      );

      if (!board)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertCanDelete(
        ctx.db,
        userId,
        board.workspaceId,
        "board:delete",
        board.createdBy ?? null,
      );

      const listIds = board.lists.map((list) => list.id);

      const deletedAt = new Date();

      await boardRepo.softDelete(ctx.db, {
        boardId: board.id,
        deletedAt,
        deletedBy: userId,
      });

      if (listIds.length) {
        const deletedLists = await listRepo.softDeleteAllByBoardId(ctx.db, {
          boardId: board.id,
          deletedAt,
          deletedBy: userId,
        });

        if (!Array.isArray(deletedLists)) {
          throw new TRPCError({
            message: `Failed to delete lists`,
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        const deletedCards = await cardRepo.softDeleteAllByListIds(ctx.db, {
          listIds,
          deletedAt,
          deletedBy: userId,
        });

        if (!Array.isArray(deletedCards)) {
          throw new TRPCError({
            message: `Failed to delete cards`,
            code: "INTERNAL_SERVER_ERROR",
          });
        }

        if (deletedCards.length) {
          const activities = deletedCards.map((card) => ({
            type: "card.archived" as const,
            createdBy: userId,
            cardId: card.id,
          }));

          await activityRepo.bulkCreate(ctx.db, activities);
        }
      }

      return { success: true };
    }),
  checkSlugAvailability: publicProcedure
    .meta({
      openapi: {
        summary: "Check if a board slug is available",
        method: "GET",
        path: "/boards/{boardPublicId}/check-slug-availability",
        description: "Checks if a board slug is available",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardSlug: z
          .string()
          .min(3)
          .max(24)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/),
        boardPublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        isReserved: z.boolean(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
        ctx.db,
        input.boardPublicId,
      );

      if (!board)
        throw new TRPCError({
          message: `Board with public ID ${input.boardPublicId} not found`,
          code: "NOT_FOUND",
        });

      const isBoardSlugAvailable = await boardRepo.isBoardSlugAvailable(
        ctx.db,
        input.boardSlug,
        board.workspaceId,
      );

      return {
        isReserved: !isBoardSlugAvailable,
      };
    }),
});
