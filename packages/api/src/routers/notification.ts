import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as pushSubscriptionRepo from "@banana/db/repository/pushSubscription.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendPushToUser } from "../utils/push";

export const notificationRouter = createTRPCRouter({
  getSubscriptionStatus: protectedProcedure
    .input(z.object({ endpoint: z.string().nullable() }))
    .output(z.object({ subscribed: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      if (!input.endpoint) {
        return { subscribed: false };
      }
      const subscribed = await pushSubscriptionRepo.existsByUserAndEndpoint(
        ctx.db,
        userId,
        input.endpoint,
      );
      return { subscribed };
    }),

  subscribePush: protectedProcedure
    .input(z.object({ subscription: z.string().min(1) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      let endpoint: string;
      try {
        endpoint = (JSON.parse(input.subscription) as { endpoint: string })
          .endpoint;
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid push subscription payload",
        });
      }

      await pushSubscriptionRepo.upsertByEndpoint(ctx.db, {
        userId,
        endpoint,
        subscriptionJson: input.subscription,
      });

      return { success: true };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().min(1) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await pushSubscriptionRepo.deleteByEndpoint(ctx.db, input.endpoint);
      return { success: true };
    }),

  sendTestPush: protectedProcedure
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await sendPushToUser(ctx.db, userId, {
        title: "Notifications enabled",
        body: "You'll now receive updates from your boards here.",
        url: "/",
      });

      return { success: true };
    }),
});
