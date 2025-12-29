import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { colours } from "@kan/shared/constants";
import { generateUID } from "@kan/shared/utils";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertUserInWorkspace } from "../utils/auth";
import { apiKeys, urls } from "./integration";

export interface TrelloBoard {
  id: string;
  name: string;
  labels: TrelloLabel[];
  lists: TrelloList[];
  cards: TrelloCard[];
  checklists: TrelloChecklist[];
}

interface TrelloLabel {
  id: string;
  name: string;
}

interface TrelloList {
  id: string;
  name: string;
}

interface TrelloChecklist {
  id: string;
  idCard: string;
  name: string;
  checkItems: TrelloCheckItem[];
}

interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  pos: number;
}

interface TrelloCard {
  id: string;
  name: string | null;
  desc: string;
  idList: string;
  labels: TrelloLabel[];
  idChecklists: string[];
  checkItemStates: TrelloCheckItemState[];
}

interface TrelloCheckItemState {
  idChecklist: string;
  idCheckItem: string;
  state: "complete" | "incomplete";
}

export const importRouter = createTRPCRouter({
  trello: createTRPCRouter({
    getBoards: protectedProcedure
      .meta({
        openapi: {
          summary: "Get boards from Trello",
          method: "GET",
          path: "/integrations/trello/boards",
          description: "Retrieves all boards from Trello",
          tags: ["Integrations"],
          protect: true,
        },
      })
      .input(z.void())
      .output(z.array(z.object({ id: z.string(), name: z.string() })))
      .query(async ({ ctx }) => {
        const apiKey = apiKeys.trello;

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
          `${urls.trello}/members/me/boards?key=${apiKey}&token=${token}`,
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
          path: "/imports/trello/boards",
          description: "Imports boards from Trello",
          tags: ["Imports"],
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

        const apiKey = apiKeys.trello;

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
            `${urls.trello}/boards/${boardId}?key=${apiKey}&token=${integration.accessToken}&lists=open&cards=open&labels=all&checklists=all&checkItemStates=all`,
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
                  checklists: data.checklists
                    .filter((checklist) => checklist.idCard === _card.id)
                    .map((_checklist) => ({
                      sourceId: _checklist.id,
                      name: _checklist.name,
                      items: _checklist.checkItems.map((_item) => ({
                        sourceId: _item.id,
                        title: _item.name,
                        completed: _item.state === "complete",
                        index: _item.pos,
                      })),
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
                title: (card.name?.trim() ?? "Untitled Card").slice(0, 2000),
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

              const checklistsToCreate: {
                cardId: number;
                name: string;
                createdBy: string;
                index: number;
                sourceId: string;
                items: {
                  sourceId: string;
                  title: string;
                  completed: boolean;
                  index: number;
                }[];
              }[] = [];

              for (const card of list.cards) {
                const _card = createdCards.find(
                  (c) => c.sourceId === card.sourceId,
                );

                if (!_card || !card.checklists.length) continue;

                for (
                  let checklistIndex = 0;
                  checklistIndex < card.checklists.length;
                  checklistIndex++
                ) {
                  const checklist = card.checklists[checklistIndex];
                  if (!checklist) continue;

                  checklistsToCreate.push({
                    cardId: _card.id,
                    name: checklist.name,
                    createdBy: userId,
                    index: checklistIndex,
                    sourceId: checklist.sourceId,
                    items: checklist.items.map((item) => ({
                      sourceId: item.sourceId,
                      title: item.title,
                      completed: item.completed,
                      index: item.index,
                    })),
                  });
                }
              }

              if (checklistsToCreate.length > 0) {
                const newChecklists = await checklistRepo.bulkCreate(
                  ctx.db,
                  checklistsToCreate.map((checklist) => ({
                    cardId: checklist.cardId,
                    name: checklist.name,
                    createdBy: checklist.createdBy,
                    index: checklist.index,
                  })),
                );

                const itemsToCreate: {
                  checklistId: number;
                  title: string;
                  createdBy: string;
                  index: number;
                  completed: boolean;
                }[] = [];

                for (let i = 0; i < checklistsToCreate.length; i++) {
                  const checklistData = checklistsToCreate[i];
                  const newChecklist = newChecklists[i];

                  if (!newChecklist || !checklistData?.items.length) continue;

                  // NOTE: Sorting here to prevent checklist items being out of order
                  const sortedItems = [...checklistData.items].sort(
                    (a, b) => a.index - b.index,
                  );

                  for (const item of sortedItems) {
                    itemsToCreate.push({
                      checklistId: newChecklist.id,
                      title: item.title,
                      createdBy: userId,
                      index: item.index,
                      completed: item.completed,
                    });
                  }
                }

                if (itemsToCreate.length > 0) {
                  await checklistRepo.bulkCreateItems(ctx.db, itemsToCreate);
                }
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
  }),
});
