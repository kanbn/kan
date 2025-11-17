import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateUID } from "@kan/shared/utils";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";
import { generateUploadUrl } from "../utils/s3";

export const attachmentRouter = createTRPCRouter({
  generateUploadUrl: protectedProcedure
    .meta({
      openapi: {
        summary: "Generate presigned URL for attachment upload",
        method: "POST",
        path: "/cards/{cardPublicId}/attachments/upload-url",
        description:
          "Generates a presigned URL for uploading an attachment to S3",
        tags: ["Attachments"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        filename: z.string().min(1).max(255),
        contentType: z.string(),
        size: z
          .number()
          .positive()
          .max(50 * 1024 * 1024), // 50MB max
      }),
    )
    .output(z.object({ url: z.string(), key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      // Get workspace publicId
      const workspace = await workspaceRepo.getById(ctx.db, card.workspaceId);
      if (!workspace)
        throw new TRPCError({
          message: `Workspace not found`,
          code: "NOT_FOUND",
        });

      const bucket = process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;
      if (!bucket)
        throw new TRPCError({
          message: `Attachments bucket not configured`,
          code: "INTERNAL_SERVER_ERROR",
        });

      // Sanitize filename
      const sanitizedFilename = input.filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200);

      const s3Key = `${workspace.publicId}/${input.cardPublicId}/${generateUID()}-${sanitizedFilename}`;

      const url = await generateUploadUrl(
        bucket,
        s3Key,
        input.contentType,
        3600, // 1 hour
      );

      return { url, key: s3Key };
    }),
  confirm: protectedProcedure
    .meta({
      openapi: {
        summary: "Confirm attachment upload and save to database",
        method: "POST",
        path: "/cards/{cardPublicId}/attachments/confirm",
        description:
          "Confirms an attachment upload and saves the record to the database",
        tags: ["Attachments"],
        protect: true,
      },
    })
    .input(
      z.object({
        cardPublicId: z.string().min(12),
        s3Key: z.string(),
        filename: z.string(),
        originalFilename: z.string(),
        contentType: z.string(),
        size: z.number().positive(),
      }),
    )
    .output(z.custom<Awaited<ReturnType<typeof cardAttachmentRepo.create>>>())
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const card = await cardRepo.getWorkspaceAndCardIdByCardPublicId(
        ctx.db,
        input.cardPublicId,
      );

      if (!card)
        throw new TRPCError({
          message: `Card with public ID ${input.cardPublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, card.workspaceId);

      const attachment = await cardAttachmentRepo.create(ctx.db, {
        cardId: card.id,
        filename: input.filename,
        originalFilename: input.originalFilename,
        contentType: input.contentType,
        size: input.size,
        s3Key: input.s3Key,
        createdBy: userId,
      });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.attachment.added",
        cardId: card.id,
        createdBy: userId,
      });

      return attachment;
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete an attachment",
        method: "DELETE",
        path: "/attachments/{attachmentPublicId}",
        description: "Soft deletes an attachment",
        tags: ["Attachments"],
        protect: true,
      },
    })
    .input(z.object({ attachmentPublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const attachment = await cardAttachmentRepo.getByPublicId(
        ctx.db,
        input.attachmentPublicId,
      );

      if (!attachment || attachment.deletedAt)
        throw new TRPCError({
          message: `Attachment with public ID ${input.attachmentPublicId} not found`,
          code: "NOT_FOUND",
        });

      const workspaceId = attachment.card.list.board.workspaceId;

      await assertUserInWorkspace(ctx.db, userId, workspaceId);

      await cardAttachmentRepo.softDelete(ctx.db, {
        attachmentId: attachment.id,
        deletedAt: new Date(),
      });

      await cardActivityRepo.create(ctx.db, {
        type: "card.updated.attachment.removed",
        cardId: attachment.cardId,
        createdBy: userId,
      });

      return { success: true };
    }),
});
