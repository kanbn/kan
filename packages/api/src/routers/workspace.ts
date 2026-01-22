import { TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import { z } from "zod";

import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as workspaceSlugRepo from "@kan/db/repository/workspaceSlug.repo";
import { generateUID } from "@kan/shared/utils";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";

export const workspaceRouter = createTRPCRouter({
  all: protectedProcedure
    .meta({
      openapi: {
        summary: "Get all workspaces",
        method: "GET",
        path: "/workspaces",
        description: "Retrieves all workspaces for the authenticated user",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z.custom<Awaited<ReturnType<typeof workspaceRepo.getAllByUserId>>>(),
    )
    .query(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const result = await workspaceRepo.getAllByUserId(ctx.db, userId);

      return result;
    }),
  byId: protectedProcedure
    .meta({
      openapi: {
        summary: "Get a workspace by public ID",
        method: "GET",
        path: "/workspaces/{workspacePublicId}",
        description: "Retrieves a workspace by its public ID",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(z.object({ workspacePublicId: z.string().min(12) }))
    .output(
      z.custom<
        Awaited<ReturnType<typeof workspaceRepo.getByPublicIdWithMembers>>
      >(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const result = await workspaceRepo.getByPublicIdWithMembers(
        ctx.db,
        input.workspacePublicId,
      );

      if (!result)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, result.id);

      // Check if user is an admin
      const userMember = result.members.find(
        (member) => member.user?.id === userId,
      );
      const isAdmin = userMember?.role === "admin";

      // Show emails if user is admin OR workspace setting allows it
      const shouldShowEmails = isAdmin || result.showEmailsToMembers === true;

      // If emails should be hidden, filter them out
      if (!shouldShowEmails) {
        const sanitizedMembers = result.members.map((member) => {
          // If user doesn't have a display name, use anonymous identifier
          const displayName =
            member.user?.name?.trim() ?? `anonymous_${member.publicId}`;

          const { email: _memberEmail, ...memberWithoutEmail } = member;
          const sanitizedUser = member.user
            ? (() => {
                const { email: _userEmail, ...userWithoutEmail } = member.user;
                return {
                  ...userWithoutEmail,
                  name: displayName,
                };
              })()
            : {
                id: null,
                name: displayName,
                image: null,
              };

          return {
            ...memberWithoutEmail,
            user: sanitizedUser,
          };
        });

        return {
          ...result,
          members: sanitizedMembers,
        } as Awaited<ReturnType<typeof workspaceRepo.getByPublicIdWithMembers>>;
      }

      return result;
    }),
  bySlug: publicProcedure
    .meta({
      openapi: {
        summary: "Get a workspace by slug",
        method: "GET",
        path: "/workspaces/{workspaceSlug}",
        description: "Retrieves a workspace by its slug",
        tags: ["Workspaces"],
        protect: false,
      },
    })
    .input(
      z.object({
        workspaceSlug: z
          .string()
          .min(3)
          .max(24)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/),
      }),
    )
    .output(
      z.custom<Awaited<ReturnType<typeof workspaceRepo.getBySlugWithBoards>>>(),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const result = await workspaceRepo.getBySlugWithBoards(
        ctx.db,
        input.workspaceSlug,
      );

      if (!result)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, result.id);

      return result;
    }),
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a workspace",
        method: "POST",
        path: "/workspaces",
        description: "Creates a new workspace",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().min(1).max(64),
        slug: z
          .string()
          .min(3)
          .max(24)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
          .optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof workspaceRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      const userEmail = ctx.user?.email;

      if (!userId || !userEmail)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      // Check if slug is provided in cloud environment
      if (input.slug && env("NEXT_PUBLIC_KAN_ENV") === "cloud") {
        throw new TRPCError({
          message: "Custom URLs are only available for Pro workspaces",
          code: "BAD_REQUEST",
        });
      }

      const workspacePublicId = generateUID();
      const workspaceSlug = input.slug ?? workspacePublicId;

      if (input.slug) {
        const reservedOrPremiumWorkspaceSlug =
          await workspaceSlugRepo.getWorkspaceSlug(ctx.db, input.slug);

        const isWorkspaceSlugAvailable =
          await workspaceRepo.isWorkspaceSlugAvailable(ctx.db, input.slug);

        if (reservedOrPremiumWorkspaceSlug) {
          throw new TRPCError({
            message: `Workspace slug '${input.slug}' is reserved or premium`,
            code: "BAD_REQUEST",
          });
        }

        if (!isWorkspaceSlugAvailable) {
          throw new TRPCError({
            message: `Workspace slug '${input.slug}' is already taken`,
            code: "BAD_REQUEST",
          });
        }
      }

      const result = await workspaceRepo.create(ctx.db, {
        publicId: workspacePublicId,
        name: input.name,
        slug: workspaceSlug,
        createdBy: userId,
        createdByEmail: userEmail,
      });

      if (!result.publicId)
        throw new TRPCError({
          message: `Unable to create workspace`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return result;
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a workspace",
        method: "PUT",
        path: "/workspaces/{workspacePublicId}",
        description: "Updates a workspace by its public ID",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        name: z.string().min(3).max(64).optional(),
        slug: z
          .string()
          .min(3)
          .max(24)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/)
          .optional(),
        description: z.string().min(3).max(280).optional(),
        showEmailsToMembers: z.boolean().optional(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof workspaceRepo.update>>>())
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
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id, "admin");

      if (input.slug) {
        const reservedOrPremiumWorkspaceSlug =
          await workspaceSlugRepo.getWorkspaceSlug(ctx.db, input.slug);

        const isWorkspaceSlugAvailable =
          await workspaceRepo.isWorkspaceSlugAvailable(ctx.db, input.slug);

        if (
          env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
          workspace.plan !== "pro" &&
          input.slug !== workspace.publicId
        ) {
          throw new TRPCError({
            message: `Workspace slug cannot be changed in cloud without upgrading to a paid plan`,
            code: "FORBIDDEN",
          });
        }

        if (
          reservedOrPremiumWorkspaceSlug?.type === "reserved" ||
          !isWorkspaceSlugAvailable
        ) {
          throw new TRPCError({
            message: `Workspace slug already taken`,
            code: "CONFLICT",
          });
        }
      }

      const result = await workspaceRepo.update(
        ctx.db,
        input.workspacePublicId,
        {
          name: input.name,
          slug: input.slug,
          description: input.description,
          showEmailsToMembers: input.showEmailsToMembers,
        },
      );

      if (!result)
        throw new TRPCError({
          message: `Unable to delete workspace`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return result;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a workspace",
        method: "DELETE",
        path: "/workspaces/{workspacePublicId}",
        description: "Deletes a workspace by its public ID",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(z.object({ workspacePublicId: z.string().min(12) }))
    .output(z.custom<Awaited<ReturnType<typeof workspaceRepo.hardDelete>>>())
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
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id, "admin");

      const result = await workspaceRepo.hardDelete(
        ctx.db,
        input.workspacePublicId,
      );

      return result;
    }),
  checkSlugAvailability: publicProcedure
    .meta({
      openapi: {
        summary: "Check if a workspace slug is available",
        method: "GET",
        path: "/workspaces/check-slug-availability",
        description: "Checks if a workspace slug is available",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspaceSlug: z
          .string()
          .min(3)
          .max(24)
          .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/),
      }),
    )
    .output(
      z.object({
        isAvailable: z.boolean(),
        isReserved: z.boolean(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const slug = input.workspaceSlug.toLowerCase();
      // check slug is not reserved
      const workspaceSlug = await workspaceSlugRepo.getWorkspaceSlug(
        ctx.db,
        slug,
      );

      // check slug is not taken already
      const isWorkspaceSlugAvailable =
        await workspaceRepo.isWorkspaceSlugAvailable(ctx.db, slug);

      const isAvailable =
        isWorkspaceSlugAvailable && workspaceSlug?.type !== "reserved";
      const isReserved = workspaceSlug?.type === "reserved";

      if (env("NEXT_PUBLIC_KAN_ENV") === "cloud") {
        await workspaceSlugRepo.createWorkspaceSlugCheck(ctx.db, {
          slug,
          userId,
          available: isAvailable,
          reserved: isReserved,
        });
      }

      return {
        isAvailable:
          isWorkspaceSlugAvailable && workspaceSlug?.type !== "reserved",
        isReserved: workspaceSlug?.type === "reserved",
      };
    }),
  search: protectedProcedure
    .meta({
      openapi: {
        summary: "Search boards and cards in a workspace",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/search",
        description:
          "Searches for boards and cards by title within a workspace",
        tags: ["Workspaces"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(50).optional().default(20),
      }),
    )
    .output(
      z.array(
        z.discriminatedUnion("type", [
          z.object({
            publicId: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            slug: z.string(),
            updatedAt: z.date().nullable(),
            createdAt: z.date(),
            type: z.literal("board"),
          }),
          z.object({
            publicId: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            boardPublicId: z.string(),
            boardName: z.string(),
            listName: z.string(),
            updatedAt: z.date().nullable(),
            createdAt: z.date(),
            type: z.literal("card"),
          }),
        ]),
      ),
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
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      const result = await workspaceRepo.searchBoardsAndCards(
        ctx.db,
        workspace.id,
        input.query,
        input.limit,
      );

      return result;
    }),
});
