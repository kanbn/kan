import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { decryptToken } from "@kan/server/utils/encryption";
import { assertPermission } from "@kan/server/utils/permissions";
import {
  getTrelloLabelColour,
  getTrelloLabelName,
} from "@kan/server/utils/trello";
import {
  decryptTrelloToken,
  encryptTrelloToken,
  isEncryptedTrelloToken,
} from "@kan/server/utils/trello-token";
import {
  generateSlug,
  generateUID,
  normalizeDescription,
} from "@kan/shared/utils";

import type { ImportFailureCode } from "./dto/import.dto.js";
import type {
  GitHubGraphQLResponse,
  GitHubProjectsResponse,
  GitHubProjectV2Node,
  TrelloBoard,
} from "./import.types.js";
import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

const log = createLogger("import");

const trelloUrl = () =>
  process.env.TRELLO_API_URL ?? "https://api.trello.com/1";

const getTrelloApiKey = () => {
  const apiKey = process.env.TRELLO_APP_API_KEY;
  if (!apiKey)
    throw new InternalServerErrorException("Trello API key not found");
  return apiKey;
};

const getTrelloTokenForUser = async (userId: string) => {
  const integration = await integrationsRepo.getProviderForUser(
    db,
    userId,
    "trello",
  );

  if (!integration) throw new UnauthorizedException("Trello token not found");

  const token = decryptTrelloToken(integration.accessToken);

  if (!isEncryptedTrelloToken(integration.accessToken))
    await integrationsRepo.updateAccessTokenIfCurrent(db, {
      userId,
      provider: "trello",
      currentAccessToken: integration.accessToken,
      accessToken: encryptTrelloToken(token),
    });

  return token;
};

const getGitHubTokenForUser = async (userId: string) => {
  const integration = await integrationsRepo.getProviderForUser(
    db,
    userId,
    "github",
  );

  if (!integration) throw new UnauthorizedException("GitHub token not found");

  return decryptToken(integration.accessToken);
};

const assertCanCreateBoards = async (
  workspacePublicId: string,
  userId: string,
) => {
  const workspace = await assertFound(
    workspaceRepo.getByPublicId(db, workspacePublicId),
    `Workspace with public ID ${workspacePublicId} not found`,
  );
  // Importing creates boards, so it needs board:create, not just membership.
  await assertPermission(db, userId, workspace.id, "board:create");
  return workspace;
};

const TRELLO_BOARD_CONCURRENCY = 3;
const TRELLO_TIMEOUT_MS = 30_000;
const TRELLO_MAX_ATTEMPTS = 3;
// Keeps every bulk insert well under Postgres's 65,535 bind parameter limit.
const INSERT_BATCH_SIZE = 1000;

class ImportBoardError extends Error {
  constructor(
    readonly code: ImportFailureCode,
    message: string,
  ) {
    super(message);
  }
}

const isTimeout = (error: unknown) =>
  error instanceof Error && error.name === "TimeoutError";

const trelloStatusCode = (status: number): ImportFailureCode => {
  if (status === 401 || status === 403) return "no_access";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  return "unknown";
};

const fetchTrello = async (url: string) => {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TRELLO_TIMEOUT_MS),
    });
    if (response.status !== 429 || attempt === TRELLO_MAX_ATTEMPTS)
      return response;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) => {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};

const inBatches = async <T, R>(
  items: T[],
  insert: (batch: T[]) => Promise<R[] | undefined>,
) => {
  const inserted: R[] = [];
  for (let i = 0; i < items.length; i += INSERT_BATCH_SIZE)
    inserted.push(
      ...((await insert(items.slice(i, i + INSERT_BATCH_SIZE))) ?? []),
    );
  return inserted;
};

const byPos = (a: { pos?: number }, b: { pos?: number }) =>
  (a.pos ?? 0) - (b.pos ?? 0);

// Names are varchar(255) and checklist item titles varchar(500), but Trello
// and GitHub allow far longer text, which would abort the whole import.
const NAME_MAX = 255;
const CHECKLIST_ITEM_MAX = 500;
const CARD_TITLE_MAX = 2000;

// Counts code points like Postgres does, so an emoji is never split in half.
export const clip = (text: string, max: number) => {
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join("") : text;
};

// One transaction per board, so a failure leaves nothing half-imported.
const importTrelloBoard = (
  data: TrelloBoard,
  ctx: { userId: string; workspaceId: number; importId: number | undefined },
) =>
  db.transaction(async (tx) => {
    const txDb = tx as unknown as typeof db;
    const { userId, workspaceId, importId } = ctx;

    const boardPublicId = generateUID();
    const newBoard = await boardRepo.create(txDb, {
      publicId: boardPublicId,
      name: clip(data.name, NAME_MAX),
      slug: boardPublicId,
      createdBy: userId,
      importId,
      workspaceId,
    });
    if (!newBoard?.id) throw new Error("Failed to create board");
    const boardId = newBoard.id;

    const labelsToCreate = data.labels.flatMap((label) => {
      const name = getTrelloLabelName(label.name, label.color);
      return name ? [{ sourceId: label.id, name, colour: label.color }] : [];
    });
    const labelIdBySource = new Map<string, number>();
    if (labelsToCreate.length) {
      const newLabels = await labelRepo.bulkCreate(
        txDb,
        labelsToCreate.map((label) => ({
          publicId: generateUID(),
          name: clip(label.name, NAME_MAX),
          colourCode: getTrelloLabelColour(label.colour),
          createdBy: userId,
          boardId,
          importId,
        })),
      );
      newLabels.forEach((label, index) => {
        const sourceId = labelsToCreate[index]?.sourceId;
        if (sourceId) labelIdBySource.set(sourceId, label.id);
      });
    }

    const cardsByList = new Map<string, TrelloBoard["cards"]>();
    for (const card of [...data.cards].sort(byPos))
      cardsByList.set(card.idList, [
        ...(cardsByList.get(card.idList) ?? []),
        card,
      ]);

    const trelloCardIdByPublicId = new Map<string, string>();
    const cardsInsert: Parameters<typeof cardRepo.bulkCreate>[1] = [];
    for (const list of [...data.lists].sort(byPos)) {
      const newList = await listRepo.create(txDb, {
        name: clip(list.name, NAME_MAX),
        createdBy: userId,
        boardId,
        importId,
      });
      (cardsByList.get(list.id) ?? []).forEach((card, index) => {
        const publicId = generateUID();
        trelloCardIdByPublicId.set(publicId, card.id);
        cardsInsert.push({
          publicId,
          title: clip(
            card.name?.trim() ? card.name.trim() : "Untitled Card",
            CARD_TITLE_MAX,
          ),
          description: normalizeDescription(card.desc),
          createdBy: userId,
          listId: newList.id,
          workspaceId,
          index,
          importId,
          dueDate: card.due ? new Date(card.due) : null,
        });
      });
    }

    const newCards = await inBatches(cardsInsert, (batch) =>
      cardRepo.bulkCreate(txDb, batch),
    );
    if (newCards.length !== cardsInsert.length)
      throw new Error("Failed to create cards");

    const cardIdBySource = new Map<string, number>();
    for (const card of newCards) {
      const trelloCardId = trelloCardIdByPublicId.get(card.publicId);
      if (trelloCardId) cardIdBySource.set(trelloCardId, card.id);
    }

    await inBatches(
      newCards.map((card) => ({
        type: "card.created" as const,
        cardId: card.id,
        createdBy: userId,
      })),
      (batch) => cardActivityRepo.bulkCreate(txDb, batch),
    );

    // bulkCreate returns rows grouped by card, so keep each card's checklists
    // together to line the returned ids up with this list.
    const checklistsToCreate = [...data.checklists]
      .sort((a, b) => a.idCard.localeCompare(b.idCard) || byPos(a, b))
      .flatMap((checklist) => {
        const cardId = cardIdBySource.get(checklist.idCard);
        return cardId ? [{ cardId, checklist }] : [];
      });
    const newChecklists = await inBatches(checklistsToCreate, (batch) =>
      checklistRepo.bulkCreate(
        txDb,
        batch.map(({ cardId, checklist }) => ({
          cardId,
          name: clip(checklist.name, NAME_MAX),
          createdBy: userId,
          index: checklist.pos ?? 0,
        })),
      ),
    );

    const itemsToCreate = checklistsToCreate.flatMap(({ checklist }, index) => {
      const checklistId = newChecklists[index]?.id;
      if (!checklistId) return [];
      // Sorted here as well as in the repo: a checklist can span two batches.
      return [...checklist.checkItems]
        .sort((a, b) => a.pos - b.pos)
        .map((item) => ({
          checklistId,
          title: clip(item.name, CHECKLIST_ITEM_MAX),
          createdBy: userId,
          index: item.pos,
          completed: item.state === "complete",
        }));
    });
    await inBatches(itemsToCreate, (batch) =>
      checklistRepo.bulkCreateItems(txDb, batch),
    );

    const cardLabels = data.cards.flatMap((card) => {
      const cardId = cardIdBySource.get(card.id);
      if (!cardId) return [];
      return card.labels.flatMap((label) => {
        const labelId = labelIdBySource.get(label.id);
        return labelId ? [{ cardId, labelId }] : [];
      });
    });
    await inBatches(cardLabels, (batch) =>
      cardRepo.bulkCreateCardLabelRelationships(txDb, batch),
    );
  });

@Injectable()
export class ImportService {
  async getTrelloBoards(input: { userId: string }) {
    const apiKey = getTrelloApiKey();
    const token = await getTrelloTokenForUser(input.userId);

    const response = await fetch(
      `${trelloUrl()}/members/me/boards?key=${apiKey}&token=${token}`,
    );

    if (!response.ok) {
      log.error({ status: response.status }, "Failed to fetch Trello boards");
      throw new InternalServerErrorException(
        "Failed to fetch boards from Trello",
      );
    }

    const data = (await response.json()) as TrelloBoard[];

    return data.map((board) => ({ id: board.id, name: board.name }));
  }

  async importTrelloBoards(input: {
    boardIds: string[];
    workspacePublicId: string;
    userId: string;
  }) {
    const { userId } = input;
    const apiKey = getTrelloApiKey();
    const token = await getTrelloTokenForUser(userId);
    const workspace = await assertCanCreateBoards(
      input.workspacePublicId,
      userId,
    );

    const newImport = await importRepo.create(db, {
      source: "trello",
      createdBy: userId,
    });
    const importId = newImport?.id;

    const results = await mapWithConcurrency(
      input.boardIds,
      TRELLO_BOARD_CONCURRENCY,
      async (boardId) => {
        let boardName: string | null = null;
        try {
          const response = await fetchTrello(
            `${trelloUrl()}/boards/${boardId}?key=${apiKey}&token=${token}&lists=open&cards=open&labels=all&labels_limit=1000&checklists=all`,
          );
          if (!response.ok)
            throw new ImportBoardError(
              trelloStatusCode(response.status),
              `Trello responded ${response.status}`,
            );

          const data = (await response.json()) as TrelloBoard;
          boardName = clip(data.name, NAME_MAX);
          await importTrelloBoard(data, {
            userId,
            workspaceId: workspace.id,
            importId,
          });
          return null;
        } catch (error) {
          log.error(
            {
              err: new Error(
                `Trello board ${boardId} (${boardName ?? "unknown"}) failed to import: ${error instanceof Error ? error.message : String(error)}`,
                { cause: error },
              ),
            },
            "Trello board failed to import",
          );
          return {
            boardId,
            boardName,
            code:
              error instanceof ImportBoardError
                ? error.code
                : isTimeout(error)
                  ? ("timeout" as const)
                  : ("unknown" as const),
          };
        }
      },
    );

    const failures = results.filter((result) => result !== null);
    const boardsCreated = results.length - failures.length;

    if (importId) {
      await importRepo.update(
        db,
        { status: boardsCreated > 0 ? "success" : "failed" },
        { importId },
      );
    }

    return { boardsCreated, failures };
  }

  async getGitHubProjects(input: { userId: string }) {
    const token = await getGitHubTokenForUser(input.userId);

    const query = `
      query {
        viewer {
          projectsV2(first: 20) {
            nodes {
              id
              title
            }
          }
          organizations(first: 10) {
            nodes {
              projectsV2(first: 10) {
                nodes {
                  id
                  title
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Kan-App",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      log.error(
        {
          status: response.status,
          statusText: response.statusText,
          body: await response.text(),
        },
        "GitHub API error fetching projects",
      );
      throw new InternalServerErrorException(
        `Failed to fetch GitHub projects: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as GitHubProjectsResponse;

    if (result.errors) {
      log.error({ errors: result.errors }, "GitHub GraphQL errors");
      throw new InternalServerErrorException(
        "Failed to fetch GitHub projects (GraphQL Error)",
      );
    }

    const userProjects = result.data.viewer.projectsV2.nodes ?? [];
    const orgProjects = result.data.viewer.organizations.nodes.flatMap(
      (org) => org.projectsV2.nodes ?? [],
    );

    return [...userProjects, ...orgProjects].map((project) => ({
      id: project.id,
      name: project.title,
    }));
  }

  async importGitHubProjects(input: {
    projectIds: string[];
    workspacePublicId: string;
    userId: string;
  }) {
    const { userId } = input;
    const token = await getGitHubTokenForUser(userId);
    const workspace = await assertCanCreateBoards(
      input.workspacePublicId,
      userId,
    );

    const newImport = await importRepo.create(db, {
      source: "github",
      createdBy: userId,
    });

    if (!newImport)
      throw new InternalServerErrorException("Failed to create import record");

    const newImportId = newImport.id;
    let projectsImported = 0;

    for (const projectId of input.projectIds) {
      // GraphQL query to fetch Project V2 details, status options, area options, and items
      const query = `
        query($id: ID!) {
          node(id: $id) {
            ... on ProjectV2 {
              title
              field(name: "Status") {
                ... on ProjectV2SingleSelectField {
                  options {
                    id
                    name
                  }
                }
              }
              areaField: field(name: "Area") {
                ... on ProjectV2SingleSelectField {
                  options {
                    id
                    name
                    color
                  }
                }
              }
              items(first: 100) {
                nodes {
                  fieldValueByName(name: "Status") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                  areaValue: fieldValueByName(name: "Area") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                  content {
                    ... on Issue {
                      title
                      body
                    }
                    ... on PullRequest {
                      title
                      body
                    }
                    ... on DraftIssue {
                      title
                      body
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "Kan-App",
        },
        body: JSON.stringify({ query, variables: { id: projectId } }),
      });

      const result = (await response.json()) as GitHubGraphQLResponse;
      if (result.errors || !result.data?.node) continue;

      const projectData = result.data.node;
      const statusOptions = projectData.field?.options ?? [];
      const areaOptions = projectData.areaField?.options ?? [];
      const items = projectData.items?.nodes ?? [];

      const boardPublicId = generateUID();
      const board = await boardRepo.create(db, {
        publicId: boardPublicId,
        name: clip(projectData.title, NAME_MAX),
        workspaceId: workspace.id,
        slug: clip(generateSlug(projectData.title), NAME_MAX),
        createdBy: userId,
        importId: newImportId,
      });

      if (!board) continue;

      // Prepare Labels
      const labelsInsert = areaOptions.map((option) => {
        let colourCode = "#0d9488"; // Default Teal
        const ghColor = option.color;

        // Map GitHub colors to Kan colors
        if (ghColor === "BLUE") colourCode = "#0284c7";
        else if (ghColor === "GREEN") colourCode = "#65a30d";
        else if (ghColor === "YELLOW") colourCode = "#ca8a04";
        else if (ghColor === "ORANGE") colourCode = "#ea580c";
        else if (ghColor === "RED") colourCode = "#dc2626";
        else if (ghColor === "PINK") colourCode = "#db2777";
        else if (ghColor === "PURPLE") colourCode = "#4f46e5";
        else if (ghColor === "GRAY") colourCode = "#0d9488";

        return {
          publicId: generateUID(),
          name: clip(option.name, NAME_MAX),
          colourCode,
          createdBy: userId,
          boardId: board.id,
          importId: newImportId,
        };
      });

      const createdLabels = await labelRepo.bulkCreate(db, labelsInsert);
      const labelMap = new Map<string, number>();

      createdLabels.forEach((label, index) => {
        const originalName = areaOptions[index]?.name;
        if (originalName) {
          labelMap.set(originalName, label.id);
        }
      });

      // Prepare Lists
      const listsInsert: {
        publicId: string;
        name: string;
        createdBy: string;
        boardId: number;
        index: number;
        importId: number;
      }[] = [];

      if (statusOptions.length === 0) {
        listsInsert.push({
          publicId: generateUID(),
          name: "To Do",
          createdBy: userId,
          boardId: board.id,
          index: 0,
          importId: newImportId,
        });
      } else {
        statusOptions.forEach((option, index) => {
          listsInsert.push({
            publicId: generateUID(),
            name: clip(option.name, NAME_MAX),
            createdBy: userId,
            boardId: board.id,
            index: index,
            importId: newImportId,
          });
        });
      }

      const createdLists = await listRepo.bulkCreate(db, listsInsert);
      const listIdMap = new Map<string, number>();
      // Keyed by the untrimmed status name, which is what items reference.
      createdLists.forEach((list, index) => {
        const originalName = statusOptions[index]?.name;
        if (originalName) {
          listIdMap.set(originalName, list.id);
        }
      });

      // Prepare Cards
      const itemsToInsert: {
        item: NonNullable<
          NonNullable<
            NonNullable<GitHubProjectV2Node["items"]>["nodes"]
          >[number]
        >;
        listId: number;
        title: string;
        description: string;
      }[] = [];

      for (const item of items) {
        const statusName = item.fieldValueByName?.name;
        const content = item.content ?? {};
        const title = content.title ?? "Untitled Card";
        const description = content.body ?? "";

        let listId = statusName ? listIdMap.get(statusName) : undefined;

        // Fallback to first list
        if (!listId && createdLists.length > 0) {
          listId = createdLists[0]?.id;
        }

        if (listId) {
          itemsToInsert.push({
            item,
            listId,
            title,
            description,
          });
        }
      }

      const cardsInput = itemsToInsert.map((data, index) => ({
        publicId: generateUID(),
        title: clip(data.title, CARD_TITLE_MAX),
        description: normalizeDescription(data.description),
        createdBy: userId,
        listId: data.listId,
        workspaceId: workspace.id,
        index: index,
        importId: newImportId,
      }));

      const createdCards = await cardRepo.bulkCreate(db, cardsInput);

      // Create Activities
      const activities = createdCards.map((card) => ({
        type: "card.created" as const,
        cardId: card.id,
        createdBy: userId,
      }));

      if (activities.length > 0) {
        await cardActivityRepo.bulkCreate(db, activities);
      }

      // Link Labels
      const cardLabelRelations: { cardId: number; labelId: number }[] = [];
      createdCards.forEach((card, index) => {
        const originalItem = itemsToInsert[index]?.item;
        const areaName = originalItem?.areaValue?.name;

        if (areaName) {
          const labelId = labelMap.get(areaName);
          if (labelId) {
            cardLabelRelations.push({
              cardId: card.id,
              labelId: labelId,
            });
          }
        }
      });

      if (cardLabelRelations.length > 0) {
        await cardRepo.bulkCreateCardLabelRelationships(db, cardLabelRelations);
      }

      projectsImported++;
    }

    if (projectsImported > 0) {
      await importRepo.update(
        db,
        { status: "success" },
        { importId: newImportId },
      );
    }

    return { projectsImported };
  }
}
