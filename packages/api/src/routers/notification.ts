import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as notificationRepo from "@kan/db/repository/notification.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/notifications",
        summary: "List notifications",
        description: "Retrieves paginated notifications for the current user",
        tags: ["Notifications"],
        protect: true,
      },
    })
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof notificationRepo.list>>>())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      return notificationRepo.list(ctx.db, {
        userId,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  unreadCount: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/notifications/unread-count",
        summary: "Get unread notification count",
        description: "Returns the count of unread notifications for the current user",
        tags: ["Notifications"],
        protect: true,
      },
    })
    .output(z.object({ count: z.number() }))
    .query(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const count = await notificationRepo.getUnreadCount(ctx.db, userId);
      return { count };
    }),

  markRead: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/notifications/{notificationPublicId}/read",
        summary: "Mark notification as read",
        description: "Marks a single notification as read",
        tags: ["Notifications"],
        protect: true,
      },
    })
    .input(z.object({ notificationPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      await notificationRepo.markReadByPublicId(ctx.db, {
        publicId: input.notificationPublicId,
        userId,
      });

      return { success: true };
    }),

  markAllRead: protectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/notifications/read-all",
        summary: "Mark all notifications as read",
        description: "Marks all unread notifications as read for the current user",
        tags: ["Notifications"],
        protect: true,
      },
    })
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      await notificationRepo.markAllRead(ctx.db, userId);

      return { success: true };
    }),
});
