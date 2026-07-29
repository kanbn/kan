import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as cardRepo from "@banana/db/repository/card.repo";
import {
  computeAbsoluteFireAt,
  computeRelativeFireAt,
  create as createCardNotification,
  getByPublicIdAndCardPublicId,
  listByCardPublicId,
  softDelete as softDeleteCardNotification,
  updateByPublicId,
} from "@banana/db/repository/cardNotification.repo";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  deleteCardNotificationFromGoogleCalendars,
  getCardMemberUserIds,
  syncCardNotificationToGoogleCalendarsForMembers,
} from "../utils/googleCalendar";

const channelSchema = z.enum(["mattermost", "google_calendar"]);
const triggerSchema = z.enum(["relative", "absolute"]);
const unitSchema = z.enum(["minutes", "hours", "days"]);

const reminderFields = {
  channel: channelSchema,
  triggerType: triggerSchema,
  offsetValue: z.number().int().positive().nullish(),
  offsetUnit: unitSchema.nullish(),
  triggerAt: z.date().nullish(),
  timeOfDay: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("09:00"),
  timezone: z.string().optional(),
} as const;

function validateReminder(
  val: {
    triggerType: "relative" | "absolute";
    offsetValue?: number | null;
    offsetUnit?: "minutes" | "hours" | "days" | null;
    triggerAt?: Date | null;
  },
  ctx: z.RefinementCtx,
) {
  if (val.triggerType === "relative") {
    if (val.offsetValue == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offsetValue"],
        message: "An offset value is required for a relative reminder.",
      });
    }
    if (val.offsetUnit == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offsetUnit"],
        message: "An offset unit is required for a relative reminder.",
      });
    }
  } else if (!val.triggerAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerAt"],
      message: "A specific date is required for an absolute reminder.",
    });
  }
}

const createInput = z
  .object({ cardPublicId: z.string(), ...reminderFields })
  .superRefine(validateReminder);

const updateInput = z
  .object({
    cardPublicId: z.string(),
    notificationPublicId: z.string(),
    ...reminderFields,
  })
  .superRefine(validateReminder);

export const cardNotificationRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ cardPublicId: z.string() }))
    .query(async ({ ctx, input }) => {
      return listByCardPublicId(ctx.db, input.cardPublicId);
    }),

  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const card = await cardRepo.getByPublicId(ctx.db, input.cardPublicId);
      if (!card) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.triggerType === "relative" && !card.dueDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This card has no due date. Add one before setting a relative reminder.",
        });
      }

      const created = await createCardNotification(ctx.db, {
        cardId: card.id,
        channel: input.channel,
        triggerType: input.triggerType,
        offsetValue: input.offsetValue ?? null,
        offsetUnit: input.offsetUnit ?? null,
        triggerAt: input.triggerAt ?? null,
        timeOfDay: input.timeOfDay,
        timezone: input.timezone ?? null,
        createdBy: userId,
      });

      scheduleGoogleCalendarEvent(ctx.db, {
        cardPublicId: input.cardPublicId,
        cardNotificationPublicId: created.publicId,
        channel: input.channel,
        triggerType: input.triggerType,
        dueDate: card.dueDate,
        offsetValue: input.offsetValue ?? null,
        offsetUnit: input.offsetUnit ?? null,
        triggerAt: input.triggerAt ?? null,
        timeOfDay: input.timeOfDay,
        timezone: input.timezone ?? null,
        title: card.title,
        listName: card.list.name,
      });

      return { publicId: created.publicId };
    }),

  update: protectedProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const existing = await getByPublicIdAndCardPublicId(ctx.db, {
        notificationPublicId: input.notificationPublicId,
        cardPublicId: input.cardPublicId,
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.triggerType === "relative" && !existing.card.dueDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This card has no due date. Add one before setting a relative reminder.",
        });
      }

      const updated = await updateByPublicId(ctx.db, input.notificationPublicId, {
        channel: input.channel,
        triggerType: input.triggerType,
        offsetValue: input.offsetValue ?? null,
        offsetUnit: input.offsetUnit ?? null,
        triggerAt: input.triggerAt ?? null,
        timeOfDay: input.timeOfDay,
        timezone: input.timezone ?? null,
      });

      if (updated) {
        scheduleGoogleCalendarEvent(ctx.db, {
          cardPublicId: input.cardPublicId,
          cardNotificationPublicId: updated.publicId,
          channel: input.channel,
          triggerType: input.triggerType,
          dueDate: existing.card.dueDate,
          offsetValue: input.offsetValue ?? null,
          offsetUnit: input.offsetUnit ?? null,
          triggerAt: input.triggerAt ?? null,
          timeOfDay: input.timeOfDay,
          timezone: input.timezone ?? null,
          title: existing.card.title,
          listName: null,
        });
      }

      return { publicId: updated?.publicId };
    }),

  delete: protectedProcedure
    .input(
      z.object({
        cardPublicId: z.string(),
        notificationPublicId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getByPublicIdAndCardPublicId(ctx.db, {
        notificationPublicId: input.notificationPublicId,
        cardPublicId: input.cardPublicId,
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await softDeleteCardNotification(ctx.db, input.notificationPublicId);

      if (existing.channel === "google_calendar") {
        getCardMemberUserIds(ctx.db, input.cardPublicId)
          .then((memberUserIds) =>
            deleteCardNotificationFromGoogleCalendars(
              ctx.db,
              input.notificationPublicId,
              memberUserIds,
            ),
          )
          .catch((err) =>
            console.error("[cardNotification] GCal delete failed:", err),
          );
      }

      return { success: true };
    }),
});

/**
 * Fire-and-forget: create/refresh the Google Calendar reminder event for a
 * google_calendar-channel reminder. Mattermost reminders are handled by the
 * poller (see apps/web/src/instrumentation.ts).
 */
function scheduleGoogleCalendarEvent(
  db: Parameters<typeof getCardMemberUserIds>[0],
  data: {
    cardPublicId: string;
    cardNotificationPublicId: string;
    channel: "mattermost" | "google_calendar";
    triggerType: "relative" | "absolute";
    dueDate: Date | null;
    offsetValue: number | null;
    offsetUnit: "minutes" | "hours" | "days" | null;
    triggerAt: Date | null;
    timeOfDay: string;
    timezone: string | null;
    title: string;
    listName: string | null;
  },
) {
  if (data.channel !== "google_calendar") return;

  const fireAt =
    data.triggerType === "relative"
      ? computeRelativeFireAt(
          data.dueDate,
          data.offsetValue,
          data.offsetUnit,
          data.timeOfDay,
          data.timezone,
        )
      : computeAbsoluteFireAt(data.triggerAt, data.timeOfDay, data.timezone);

  if (!fireAt) return;

  getCardMemberUserIds(db, data.cardPublicId)
    .then((memberUserIds) =>
      syncCardNotificationToGoogleCalendarsForMembers(
        db,
        {
          cardPublicId: data.cardPublicId,
          cardNotificationPublicId: data.cardNotificationPublicId,
          title: data.title,
          fireAt,
          listName: data.listName ?? undefined,
        },
        memberUserIds,
      ),
    )
    .catch((err) =>
      console.error("[cardNotification] GCal sync failed:", err),
    );
}
