import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import {
  generateDownloadUrl,
  generateUID,
  generateUploadUrl,
} from "@kan/shared/utils";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  BoardBackgroundPreviewError,
  deleteBoardBackgroundObjects,
  ensureBoardBackgroundPreviews,
  getBoardBackgroundPreviewKeys,
  inspectBoardBackgroundObject,
} from "../utils/boardBackgroundPreview";
import { assertCanEdit, assertPermission } from "../utils/permissions";

const logger = createLogger("board-background");
const maxSourceBytes = 50 * 1024 * 1024;
const imageContentTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const getBucket = () => {
  const bucket = process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;
  if (!bucket)
    throw new TRPCError({
      message: "Attachments bucket not configured",
      code: "INTERNAL_SERVER_ERROR",
    });

  return bucket;
};

const deleteBackgroundObjects = async (
  bucket: string,
  boardPublicId: string,
  s3Key: string,
) => {
  const deletions = await deleteBoardBackgroundObjects({
    bucket,
    boardPublicId,
    s3Key,
  });

  deletions.forEach(({ key, result }) => {
    if (result?.status === "rejected")
      logger.warn(
        { err: result.reason, key, boardPublicId },
        "Failed to delete board background object",
      );
  });
};

const getEditableBoard = async (
  db: Parameters<typeof boardRepo.getWorkspaceAndBoardIdByBoardPublicId>[0],
  userId: string,
  boardPublicId: string,
) => {
  const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
    db,
    boardPublicId,
  );

  if (!board)
    throw new TRPCError({
      message: `Board with public ID ${boardPublicId} not found`,
      code: "NOT_FOUND",
    });

  await assertCanEdit(
    db,
    userId,
    board.workspaceId,
    "board:edit",
    board.createdBy ?? null,
  );

  return board;
};

export const boardBackgroundRouter = createTRPCRouter({
  generateUploadUrl: protectedProcedure
    .meta({
      openapi: {
        summary: "Generate a board background upload URL",
        method: "POST",
        path: "/boards/{boardPublicId}/background/upload-url",
        description:
          "Generates a presigned URL for uploading a board background image",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        filename: z.string().min(1).max(255),
        contentType: imageContentTypeSchema,
        size: z.number().positive().max(maxSourceBytes),
      }),
    )
    .output(z.object({ url: z.string(), key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const board = await getEditableBoard(ctx.db, userId, input.boardPublicId);
      const workspace = await workspaceRepo.getById(ctx.db, board.workspaceId);
      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      const sanitizedFilename = input.filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200);
      const key = `${workspace.publicId}/board-backgrounds/${input.boardPublicId}/${generateUID()}-${sanitizedFilename}`;
      const url = await generateUploadUrl(
        getBucket(),
        key,
        input.contentType,
        3600,
      );

      return { url, key };
    }),
  confirm: protectedProcedure
    .meta({
      openapi: {
        summary: "Confirm a board background upload",
        method: "POST",
        path: "/boards/{boardPublicId}/background/confirm",
        description:
          "Validates an uploaded image, creates previews and selects it as the board background",
        tags: ["Boards"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardPublicId: z.string().min(12),
        key: z.string().min(1).max(500),
        size: z.number().positive().max(maxSourceBytes),
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

      const board = await getEditableBoard(ctx.db, userId, input.boardPublicId);
      const workspace = await workspaceRepo.getById(ctx.db, board.workspaceId);
      if (!workspace)
        throw new TRPCError({
          message: "Workspace not found",
          code: "NOT_FOUND",
        });

      const expectedKeyPrefix = `${workspace.publicId}/board-backgrounds/${input.boardPublicId}/`;
      const keySuffix = input.key.slice(expectedKeyPrefix.length);
      if (
        !input.key.startsWith(expectedKeyPrefix) ||
        !keySuffix ||
        keySuffix.includes("/")
      )
        throw new TRPCError({
          message: "Background key does not belong to this board upload",
          code: "BAD_REQUEST",
        });

      const bucket = getBucket();
      const storedObject = await inspectBoardBackgroundObject(
        bucket,
        input.key,
      );
      if (!storedObject)
        throw new TRPCError({
          message: "Uploaded board background object not found",
          code: "BAD_REQUEST",
        });

      if (storedObject.contentLength !== input.size)
        throw new TRPCError({
          message: "Uploaded board background size does not match confirmation",
          code: "BAD_REQUEST",
        });

      try {
        await ensureBoardBackgroundPreviews({
          bucket,
          boardPublicId: input.boardPublicId,
          s3Key: input.key,
        });
      } catch (error) {
        if (board.backgroundImageKey !== input.key)
          await deleteBackgroundObjects(bucket, input.boardPublicId, input.key);

        if (
          error instanceof BoardBackgroundPreviewError &&
          error.code !== "STORAGE_FAILURE"
        )
          throw new TRPCError({
            message: error.message,
            code: "BAD_REQUEST",
            cause: error,
          });

        throw new TRPCError({
          message: "Failed to process board background image",
          code: "INTERNAL_SERVER_ERROR",
          cause: error,
        });
      }

      const result = await boardRepo.update(ctx.db, {
        boardPublicId: input.boardPublicId,
        name: undefined,
        slug: undefined,
        visibility: undefined,
        background: { kind: "image", imageKey: input.key },
      });

      if (!result) {
        if (board.backgroundImageKey !== input.key)
          await deleteBackgroundObjects(bucket, input.boardPublicId, input.key);
        throw new TRPCError({
          message: "Failed to update board background",
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      if (board.backgroundImageKey && board.backgroundImageKey !== input.key)
        await deleteBackgroundObjects(
          bucket,
          input.boardPublicId,
          board.backgroundImageKey,
        );

      return { success: true };
    }),
  urls: publicProcedure
    .meta({
      openapi: {
        summary: "Resolve board background preview URLs",
        method: "GET",
        path: "/board-backgrounds/urls",
        description:
          "Resolves a bounded batch of board background preview URLs",
        tags: ["Boards"],
        protect: false,
      },
    })
    .input(
      z.object({
        boardPublicIds: z.array(z.string().min(12)).min(1).max(40),
      }),
    )
    .output(
      z.record(
        z.string(),
        z.array(z.object({ width: z.number(), url: z.string() })).nullable(),
      ),
    )
    .query(async ({ ctx, input }) => {
      const boardPublicIds = [...new Set(input.boardPublicIds)];
      const boards = await boardRepo.getBackgroundsByPublicIds(
        ctx.db,
        boardPublicIds,
      );

      if (boards.length !== boardPublicIds.length)
        throw new TRPCError({
          message: "One or more boards were not found",
          code: "NOT_FOUND",
        });

      const privateWorkspaceIds = [
        ...new Set(
          boards
            .filter((board) => board.visibility !== "public")
            .map((board) => board.workspaceId),
        ),
      ];
      const userId = ctx.user?.id;
      if (privateWorkspaceIds.length > 0 && !userId)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      if (userId)
        await Promise.all(
          privateWorkspaceIds.map((workspaceId) =>
            assertPermission(ctx.db, userId, workspaceId, "board:view"),
          ),
        );

      const hasImages = boards.some((board) => board.backgroundImageKey);
      const bucket = hasImages ? getBucket() : null;
      const entries = await Promise.all(
        boards.map(async (board) => {
          if (!board.backgroundImageKey || !bucket)
            return [board.publicId, null] as const;

          const urls = await Promise.all(
            getBoardBackgroundPreviewKeys(
              board.publicId,
              board.backgroundImageKey,
            ).map(async ({ width, key }) => ({
              width,
              url: await generateDownloadUrl(bucket, key, 86400),
            })),
          );

          return [board.publicId, urls] as const;
        }),
      );

      return Object.fromEntries(entries);
    }),
});
