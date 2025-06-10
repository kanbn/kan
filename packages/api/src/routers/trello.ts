import { TRPCError } from "@trpc/server";
import { env } from "next-runtime-env";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { colours } from "@kan/shared/constants";
import { generateUID } from "@kan/shared/utils";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";
import { TrelloBoard } from "./import";

const TRELLO_API_URL = "https://api.trello.com/1";

export const trelloRouter = createTRPCRouter({
  getBoards: protectedProcedure
    .meta({
      openapi: {
        summary: "Get boards from Trello",
        method: "GET",
        path: "/trello/boards",
        description: "Retrieves all boards from Trello",
        tags: ["Trello"],
        protect: true,
      },
    })
    .output(z.array(z.object({ id: z.string(), name: z.string() })))
    .query(async ({ ctx }) => {
      const apiKey = process.env.TRELLO_APP_API_KEY;

      if (!apiKey)
        throw new TRPCError({
          message: "Trello API key not found",
          code: "INTERNAL_SERVER_ERROR",
        });

      const user = ctx.user;

      if (!user)
        throw new TRPCError({
          message: "User not authenticated",
          code: "UNAUTHORIZED",
        });

      const integration = await integrationsRepo.getProviderForUser(
        ctx.db,
        user.id,
        "trello",
      );

      const token = integration?.accessToken;

      if (!token)
        throw new TRPCError({
          message: "Trello token not found",
          code: "UNAUTHORIZED",
        });

      const response = await fetch(
        `${TRELLO_API_URL}/members/me/boards?key=${apiKey}&token=${token}`,
      );

      const data = (await response.json()) as TrelloBoard[];

      return data.map((board) => ({
        id: board.id,
        name: board.name,
      }));
    }),
  importBoards: protectedProcedure
    .meta({
      openapi: {
        summary: "Import boards from Trello",
        method: "POST",
        path: "/trello/import",
        description: "Imports boards from Trello",
        tags: ["Trello"],
        protect: true,
      },
    })
    .input(
      z.object({
        boardIds: z.array(z.string()),
        workspacePublicId: z.string().min(12),
      }),
    )
    .output(z.object({ boardsCreated: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      const apiKey = process.env.TRELLO_APP_API_KEY;

      if (!apiKey)
        throw new TRPCError({
          message: "Trello API key not found",
          code: "INTERNAL_SERVER_ERROR",
        });

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const integration = await integrationsRepo.getProviderForUser(
        ctx.db,
        userId,
        "trello",
      );

      if (!integration)
        throw new TRPCError({
          message: "Trello token not found",
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });

      await assertUserInWorkspace(ctx.db, userId, workspace.id);

      const newImport = await importRepo.create(ctx.db, {
        source: "trello",
        createdBy: userId,
      });

      const newImportId = newImport?.id;

      let boardsCreated = 0;

      for (const boardId of input.boardIds) {
