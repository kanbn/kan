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
        const response = await fetch(
          `${TRELLO_API_URL}/boards/${boardId}?key=${apiKey}&token=${integration.accessToken}&lists=open&cards=open&labels=all`,
        );
        const data = (await response.json()) as TrelloBoard;

        const formattedData = {
          name: data.name,
          labels: data.labels
            .map((label) => ({
              sourceId: label.id,
              name: label.name,
            }))
            .filter((_label) => !!_label.name),
          lists: data.lists.map((list) => ({
            name: list.name,
            cards: data.cards
              .filter((card) => card.idList === list.id)
              .map((_card) => ({
                sourceId: _card.id,
                name: _card.name,
                description: _card.desc,
                labels: _card.labels.map((label) => ({
                  sourceId: label.id,
                  name: label.name,
                })),
              })),
          })),
        };

        const boardPublicId = generateUID();

        const newBoard = await boardRepo.create(ctx.db, {
          publicId: boardPublicId,
          name: formattedData.name,
          slug: boardPublicId,
          createdBy: userId,
          importId: newImportId,
          workspaceId: workspace.id,
        });

        const newBoardId = newBoard?.id;

        if (!newBoardId)
          throw new TRPCError({
            message: "Failed to create new board",
            code: "INTERNAL_SERVER_ERROR",
          });

        let createdLabels: { id: number; sourceId: string }[] = [];
        let createdCards: { id: number; sourceId: string }[] = [];

        if (formattedData.labels.length) {
          const labelsInsert = formattedData.labels.map((label, index) => ({
            publicId: generateUID(),
            name: label.name,
            colourCode: colours[index % colours.length]?.code ?? "#0d9488",
            createdBy: userId,
            boardId: newBoardId,
            importId: newImportId,
          }));

          const newLabels = await labelRepo.bulkCreate(ctx.db, labelsInsert);

          if (newLabels.length)
            createdLabels = newLabels
              .map((label, index) => ({
                id: label.id,
                sourceId: formattedData.labels[index]?.sourceId ?? "",
              }))
              .filter((label) => !!label.sourceId);
        }

        for (const list of formattedData.lists) {
          const newList = await listRepo.create(ctx.db, {
            name: list.name,
            createdBy: userId,
            boardId: newBoardId,
            importId: newImportId,
          });

          const newListId = newList.id;

          if (list.cards.length && newListId) {
            const cardsInsert = list.cards.map((card, index) => ({
              publicId: generateUID(),
              title: card.name,
              description: card.description,
              createdBy: userId,
              listId: newListId,
              index,
              importId: newImportId,
            }));

            const newCards = await cardRepo.bulkCreate(ctx.db, cardsInsert);

            if (!newCards.length)
              throw new TRPCError({
                message: "Failed to create new cards",
                code: "INTERNAL_SERVER_ERROR",
              });

            createdCards = createdCards.concat(
              newCards
                .map((card, index) => ({
                  id: card.id,
                  sourceId: list.cards[index]?.sourceId ?? "",
                }))
                .filter((card) => !!card.sourceId),
            );

            const activities = newCards.map((card) => ({
              type: "card.created" as const,
              cardId: card.id,
              createdBy: userId,
            }));

            if (newCards.length > 0) {
              await cardActivityRepo.bulkCreate(ctx.db, activities);
            }

            if (createdLabels.length && createdCards.length) {
              const cardLabelRelations: {
                cardId: number;
                labelId: number;
              }[] = [];

              for (const card of list.cards) {
                const _card = createdCards.find(
                  (c) => c.sourceId === card.sourceId,
                );

                for (const label of card.labels) {
                  const _label = createdLabels.find(
                    (l) => l.sourceId === label.sourceId,
                  );

                  if (_card && _label) {
                    cardLabelRelations.push({
                      cardId: _card.id,
                      labelId: _label.id,
                    });
                  }
                }
              }

              if (cardLabelRelations.length) {
                await cardRepo.bulkCreateCardLabelRelationship(
                  ctx.db,
                  cardLabelRelations,
                );
              }
            }
          }
        }

        boardsCreated++;
      }

      if (boardsCreated > 0 && newImportId) {
        await importRepo.update(
          ctx.db,
          { status: "success" },
          { importId: newImport.id },
        );
      }

      return { boardsCreated };
    }),
});