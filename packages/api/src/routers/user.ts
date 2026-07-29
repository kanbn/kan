import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import { z } from "zod";

import * as userRepo from "@banana/db/repository/user.repo";
import { generateAvatarUrl } from "@banana/shared/utils";

import { createTRPCRouter, protectedProcedure } from "../trpc";

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
        hasPassword: z.boolean(),
        hasMagicLinkAccount: z.boolean(),
        apiKey: z
          .object({
            id: z.number(),
            prefix: z.string().nullable(),
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
        hasPassword: result.hasPassword,
        hasMagicLinkAccount: result.hasMagicLinkAccount,
        apiKey: apiKey ? { id: apiKey.id, prefix: apiKey.prefix } : null,
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
  getCalendarFeedUrl: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/users/me/calendar-feed-url",
        summary: "Get calendar feed URL",
        description:
          "Returns the authenticated user's personal iCalendar (.ics) feed URL, or null if none has been generated yet.",
        tags: ["Users"],
        protect: true,
      },
    })
    .input(z.void())
    .output(z.object({ url: z.string().nullable() }))
    .query(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const token = await userRepo.getCalendarToken(ctx.db, userId);
      if (!token) return { url: null };

      return { url: `${env("NEXT_PUBLIC_BASE_URL")}/api/calendar/${token}` };
    }),
  regenerateCalendarToken: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/users/me/calendar-feed-url",
        summary: "Regenerate calendar feed token",
        description:
          "Generates (or replaces) the secret token backing the user's iCalendar feed and returns the new feed URL. The previous URL stops working.",
        tags: ["Users"],
        protect: true,
      },
    })
    .input(z.void())
    .output(z.object({ url: z.string() }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const token = randomBytes(24).toString("hex");
      await userRepo.setCalendarToken(ctx.db, userId, token);

      return { url: `${env("NEXT_PUBLIC_BASE_URL")}/api/calendar/${token}` };
    }),
  setPassword: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/users/me/password",
        summary: "Set password",
        description:
          "Sets a password for a user who signed up via magic link and has no password yet",
        tags: ["Users"],
        protect: true,
      },
    })
    .input(
      z.object({
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters"),
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

      const existing = await userRepo.getById(ctx.db, userId);

      if (!existing) {
        throw new TRPCError({
          message: `User not found`,
          code: "NOT_FOUND",
        });
      }

      if (existing.hasPassword) {
        throw new TRPCError({
          message: `Password already set; use change password instead`,
          code: "BAD_REQUEST",
        });
      }

      try {
        await ctx.auth.api.setPassword({ newPassword: input.newPassword });
      } catch {
        throw new TRPCError({
          message: "Failed to set password",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      return { success: true };
    }),
  setTimezone: protectedProcedure
    .input(
      z.object({
        timezone: z
          .string()
          .min(1)
          .max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await userRepo.setTimezone(ctx.db, userId, input.timezone);
      return { success: true };
    }),
});
