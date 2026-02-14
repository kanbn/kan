import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as webhookRepo from "@kan/db/repository/webhook.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { webhookEvents } from "@kan/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const webhookEventSchema = z.enum(webhookEvents);

export const webhookRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      openapi: {
        summary: "Get all webhooks for a workspace",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/webhooks",
        description: "Retrieves all webhooks configured for a workspace",
        tags: ["Webhooks"],
        protect: true,
      },
    })
    .input(z.object({ workspacePublicId: z.string().min(12) }))
    .output(
      z.array(
        z.object({
          publicId: z.string(),
          name: z.string(),
          url: z.string(),
          events: z.array(webhookEventSchema),
          active: z.boolean(),
          createdAt: z.date(),
          updatedAt: z.date().nullable(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "workspace:manage");

      return webhookRepo.getAllByWorkspaceId(ctx.db, workspace.id);
    }),

  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a webhook",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/webhooks",
        description: "Creates a new webhook for a workspace",
        tags: ["Webhooks"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        name: z.string().min(1).max(255),
        url: z.string().url().max(2048),
        secret: z.string().max(512).optional(),
        events: z.array(webhookEventSchema).min(1),
      }),
    )
    .output(
      z.object({
        publicId: z.string(),
        name: z.string(),
        url: z.string(),
        events: z.array(webhookEventSchema),
        active: z.boolean(),
        createdAt: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "workspace:manage");

      const result = await webhookRepo.create(ctx.db, {
        workspaceId: workspace.id,
        name: input.name,
        url: input.url,
        secret: input.secret,
        events: input.events,
        createdBy: userId,
      });

      if (!result)
        throw new TRPCError({
          message: "Unable to create webhook",
          code: "INTERNAL_SERVER_ERROR",
        });

      return result;
    }),

  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a webhook",
        method: "PUT",
        path: "/workspaces/{workspacePublicId}/webhooks/{webhookPublicId}",
        description: "Updates a webhook by its public ID",
        tags: ["Webhooks"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        webhookPublicId: z.string().min(12),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().max(2048).optional(),
        secret: z.string().max(512).optional(),
        events: z.array(webhookEventSchema).min(1).optional(),
        active: z.boolean().optional(),
      }),
    )
    .output(
      z.object({
        publicId: z.string(),
        name: z.string(),
        url: z.string(),
        events: z.array(webhookEventSchema),
        active: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "workspace:manage");

      const webhook = await webhookRepo.getByPublicId(
        ctx.db,
        input.webhookPublicId,
      );

      if (!webhook || webhook.workspaceId !== workspace.id)
        throw new TRPCError({
          message: "Webhook not found",
          code: "NOT_FOUND",
        });

      const result = await webhookRepo.update(ctx.db, input.webhookPublicId, {
        name: input.name,
        url: input.url,
        secret: input.secret,
        events: input.events,
        active: input.active,
      });

      if (!result)
        throw new TRPCError({
          message: "Unable to update webhook",
          code: "INTERNAL_SERVER_ERROR",
        });

      return result;
    }),

  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a webhook",
        method: "DELETE",
        path: "/workspaces/{workspacePublicId}/webhooks/{webhookPublicId}",
        description: "Deletes a webhook by its public ID",
        tags: ["Webhooks"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        webhookPublicId: z.string().min(12),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "workspace:manage");

      const webhook = await webhookRepo.getByPublicId(
        ctx.db,
        input.webhookPublicId,
      );

      if (!webhook || webhook.workspaceId !== workspace.id)
        throw new TRPCError({
          message: "Webhook not found",
          code: "NOT_FOUND",
        });

      await webhookRepo.hardDelete(ctx.db, input.webhookPublicId);

      return { success: true };
    }),

  test: protectedProcedure
    .meta({
      openapi: {
        summary: "Test a webhook",
        method: "POST",
        path: "/workspaces/{workspacePublicId}/webhooks/{webhookPublicId}/test",
        description: "Sends a test payload to a webhook",
        tags: ["Webhooks"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        webhookPublicId: z.string().min(12),
      }),
    )
    .output(
      z.object({
        success: z.boolean(),
        statusCode: z.number().optional(),
        error: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      await assertPermission(ctx.db, userId, workspace.id, "workspace:manage");

      const webhook = await webhookRepo.getByPublicId(
        ctx.db,
        input.webhookPublicId,
      );

      if (!webhook || webhook.workspaceId !== workspace.id)
        throw new TRPCError({
          message: "Webhook not found",
          code: "NOT_FOUND",
        });

      // Import sendWebhookToUrl dynamically to avoid circular dependencies
      const { sendWebhookToUrl, createCardWebhookPayload } = await import(
        "../utils/webhook"
      );

      const testPayload = createCardWebhookPayload("card.created", {
        id: "test-card-id",
        title: "Test Card",
        description: "This is a test webhook payload",
        dueDate: null,
        listId: "test-list-id",
      }, {
        boardId: "test-board-id",
        boardName: "Test Board",
        listName: "Test List",
        user: {
          id: userId,
          name: ctx.user?.name ?? "Test User",
        },
      });

      const result = await sendWebhookToUrl(
        webhook.url,
        webhook.secret ?? undefined,
        testPayload,
      );

      return result;
    }),
});
