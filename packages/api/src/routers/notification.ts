import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as pushSubscriptionRepo from "@banana/db/repository/pushSubscription.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendPushToUser } from "../utils/push";

export const notificationRouter = createTRPCRouter({
  /**
   * Whether THIS device/browser is set up to receive push for the current user.
   *
   * A push subscription is browser-level, not account-level: the browser holds
   * one `PushSubscription` per origin regardless of which account is logged in.
   * So "subscribed" is only true when THIS browser's subscription endpoint is
   * registered to the CURRENT user. This correctly handles:
   *  - a second device that has never enabled notifications (shows Enable), and
   *  - a shared browser where account A subscribed but account B is now logged
   *    in (B's pushes wouldn't be wired to this browser, so B sees Enable).
   */
  getSubscriptionStatus: protectedProcedure
    .input(z.object({ endpoint: z.string().nullable() }))
    .output(z.object({ subscribed: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      // No subscription on this device → nothing to check. The hook guards with
      // `enabled`, but React Query's refetch() bypasses `enabled`, so tolerate
      // a null endpoint here rather than throwing a 400.
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

  /**
   * Persist a browser push subscription for the authenticated user.
   * `subscription` is the JSON-serialised `PushSubscription` from the browser.
   * De-duplicated by endpoint, so re-subscribing the same browser updates in place.
   */
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

  /**
   * Remove a single device's subscription (e.g. user turns off notifications).
   */
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

  /**
   * Send a test notification to all of the current user's devices so they can
   * verify their setup works end-to-end.
   */
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
