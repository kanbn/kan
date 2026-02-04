import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as userRepo from "@kan/db/repository/user.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { generateAvatarUrl } from "@kan/shared/utils";

export const userRouter = createTRPCRouter({
  getUser: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/users/me",
        summary: "Get user",
        description:
          "Retrieves the currently authenticated user's profile information",
        tags: ["Users"],
        protect: true,
      },
    })
    .input(z.void())
    .output(
      z.object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
        stripeCustomerId: z.string().nullable(),
        apiKey: z
          .object({
            id: z.number(),
            prefix: z.string().nullable(),
            key: z.string(),
          })
          .nullable(),
      }),
    )
    .query(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const result = await userRepo.getById(ctx.db, userId);

      if (!result) {
        throw new TRPCError({
          message: `User not found`,
          code: "NOT_FOUND",
        });
      }

      const apiKey = result.apiKeys[0];

      // Generate presigned URL for avatar
      const imageUrl = await generateAvatarUrl(result.image);

      return {
        ...result,
        image: imageUrl,
        apiKey: apiKey ?? null,
      };
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/users",
        summary: "Update user",
        description:
          "Updates the currently authenticated user's profile information",
        tags: ["Users"],
        protect: true,
      },
    })
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .output(
      z.object({
        name: z.string().nullable(),
        image: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const result = await userRepo.update(ctx.db, userId, input);

      if (!result) {
        throw new TRPCError({
          message: `User not found`,
          code: "NOT_FOUND",
        });
      }

      // Generate presigned URL for avatar
      const imageUrl = await generateAvatarUrl(result.image);

      return {
        ...result,
        image: imageUrl,
      };
    }),
});
