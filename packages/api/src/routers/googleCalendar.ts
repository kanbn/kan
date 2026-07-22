import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as integrationsRepo from "@banana/db/repository/integration.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  buildAuthUrl,
  deleteCalendarEvent,
  exchangeCodeForTokens,
  getAssignedDueCardsForUser,
  getValidAccessToken,
  storeTokens,
  syncAllCardsForUser,
} from "../utils/googleCalendar";

export const googleCalendarRouter = createTRPCRouter({
  getAuthUrl: protectedProcedure
    .output(z.object({ url: z.string() }))
    .query(async ({ ctx }) => {
      const user = ctx.user;

      if (!user) {
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }

      const existing = await integrationsRepo.getProviderForUser(
        ctx.db,
        user.id,
        "google_calendar",
      );

      if (existing) {
        throw new TRPCError({
          message: "Google Calendar already connected",
          code: "BAD_REQUEST",
        });
      }

      const url = buildAuthUrl();
      return { url };
    }),

  connect: protectedProcedure
    .input(z.object({ code: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!user) {
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }

      try {
        const tokens = await exchangeCodeForTokens(input.code);
        await storeTokens(ctx.db, user.id, tokens);

        syncAllCardsForUser(ctx.db, user.id).catch((err) => {
          console.error(
            `[GoogleCalendar] Initial sync failed for user ${user.id}:`,
            err,
          );
        });

        return { success: true };
      } catch (error) {
        console.error("Failed to connect Google Calendar:", error);
        throw new TRPCError({
          message: "Failed to connect Google Calendar",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    }),

  disconnect: protectedProcedure
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      const user = ctx.user;

      if (!user) {
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }

      const accessToken = await getValidAccessToken(ctx.db, user.id);

      if (accessToken) {
        const cardsToRemove = await getAssignedDueCardsForUser(ctx.db, user.id);
        console.log(
          `[GoogleCalendar] Disconnect: removing ${cardsToRemove.length} events for user ${user.id}`,
        );

        const results = await Promise.allSettled(
          cardsToRemove.map((card) =>
            deleteCalendarEvent(accessToken, card.cardPublicId),
          ),
        );

        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          console.error(
            `[GoogleCalendar] Disconnect: ${failed}/${cardsToRemove.length} events failed to delete for user ${user.id}`,
          );
        }
      }

      await integrationsRepo.deleteProviderForUser(
        ctx.db,
        user.id,
        "google_calendar",
      );

      return { success: true };
    }),

  status: protectedProcedure
    .output(z.object({ connected: z.boolean() }))
    .query(async ({ ctx }) => {
      const user = ctx.user;

      if (!user) {
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });
      }

      const connected = await integrationsRepo.isProviderAvailableForUser(
        ctx.db,
        user.id,
        "google_calendar",
      );

      return { connected };
    }),
});
