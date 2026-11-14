import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createAvatarUrlResolver } from "@kan/server/utils/avatarUrls";
import {
  assertBoardAccess,
  assertCanDelete,
  assertCanEdit,
  assertPermission,
  filterBoardAssignable,
  isWorkspaceAdmin,
} from "@kan/server/utils/permissions";
import { colours } from "@kan/shared/constants";
import {
  convertDueDateFiltersToRanges,
  generateSlug,
  generateUID,
} from "@kan/shared/utils";

import { db } from "../../common/session.util.js";

type WithIsoDueDates<B> = B extends { lists: (infer L)[] }
  ? Omit<B, "lists"> & {
      lists: (L extends { cards: (infer C)[] }
        ? Omit<L, "cards"> & {
            cards: (Omit<C, "dueDate"> & { dueDate: string | null })[];
          }
        : never)[];
    }
  : never;

const withIsoDueDates = <
  B extends { lists: { cards: { dueDate: Date | null }[] }[] },
>(
  board: B,
) =>
  ({
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        dueDate: card.dueDate?.toISOString() ?? null,
      })),
    })),
  }) as unknown as WithIsoDueDates<B>;

@Injectable()
export class BoardService {
  async all(input: {
    workspacePublicId: string;
    type?: "regular" | "template";
    archived?: boolean;
    userId: string;
  }) {
    const { userId } = input;
    const workspace = await workspaceRepo.getByPublicId(
      db,
      input.workspacePublicId,
    );

    if (!workspace)
      throw new NotFoundException(
        `Workspace with public ID ${input.workspacePublicId} not found`,
      );

    await assertPermission(db, userId, workspace.id, "board:view");

    const isAdmin = await isWorkspaceAdmin(db, userId, workspace.id);

    const result = boardRepo.getAllByWorkspaceId(db, workspace.id, userId, {
      type: input.type,
      archived: input.archived ?? false,
      isWorkspaceAdmin: isAdmin,
    });

    return result;
  }

  async byId(input: {
    boardPublicId: string;
    members?: string[];
    labels?: string[];
    lists?: string[];
    dueDateFilters?: (
      | "overdue"
      | "today"
      | "tomorrow"
      | "next-week"
      | "next-month"
      | "no-due-date"
    )[];
    type?: "regular" | "template";
    cardView: "full" | "summary";
    userId: string;
  }) {
    const { userId } = input;
    const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
      db,
      input.boardPublicId,
    );

    if (!board)
      throw new NotFoundException(
        `Board with public ID ${input.boardPublicId} not found`,
      );

    await assertPermission(db, userId, board.workspaceId, "board:view");
    await assertBoardAccess(db, userId, board);

    // Convert semantic string filters to date ranges expected by the repo
    const dueDateFilters = input.dueDateFilters
      ? convertDueDateFiltersToRanges(input.dueDateFilters)
      : [];

    const result = await boardRepo.getByPublicId(
      db,
      input.boardPublicId,
      userId,
      {
        members: input.members ?? [],
        labels: input.labels ?? [],
        lists: input.lists ?? [],
        dueDate: dueDateFilters,
        type: input.type,
        cardView: input.cardView,
      },
    );

    if (!result) {
      throw new NotFoundException(
        `Board with public ID ${input.boardPublicId} not found`,
      );
    }

    const resolveAvatarUrl = createAvatarUrlResolver();

    // Generate presigned URLs for workspace member avatars
    const workspaceWithAvatarUrls = {
      ...result.workspace,
      // Only offer people who belong on this board as assignees/filters.
      members: await Promise.all(
        (await filterBoardAssignable(db, board, result.workspace.members)).map(
          async (member) => {
            if (!member.user?.image) {
              return member;
            }

            const avatarUrl = await resolveAvatarUrl(member.user.image);
            return {
              ...member,
              user: {
                ...member.user,
                image: avatarUrl,
              },
            };
          },
        ),
      ),
    };

    // Generate presigned URLs for card member avatars
    const listsWithAvatarUrls = await Promise.all(
      result.lists.map(async (list) => ({
        ...list,
        cards: await Promise.all(
          list.cards.map(async (card) => {
            const members = await Promise.all(
              card.members.map(async (member) => {
                if (!member.user?.image) return member;
                const avatarUrl = await resolveAvatarUrl(member.user.image);
                return {
                  ...member,
                  user: { ...member.user, image: avatarUrl },
                };
              }),
            );

            if (input.cardView === "summary") {
              if (!card.summary) {
                throw new InternalServerErrorException(
                  "Card summary was not returned",
                );
              }

              return {
                ...card,
                members,
                summary: card.summary,
              };
            }

            return { ...card, members };
          }),
        ),
      })),
    );

    return withIsoDueDates({
      ...result,
      lists: listsWithAvatarUrls,
      workspace: workspaceWithAvatarUrls,
    });
  }

  async bySlug(input: {
    workspaceSlug: string;
    boardSlug: string;
    members?: string[];
    labels?: string[];
    lists?: string[];
    dueDateFilters?: (
      | "overdue"
      | "today"
      | "tomorrow"
      | "next-week"
      | "next-month"
      | "no-due-date"
    )[];
  }) {
    const workspace = await workspaceRepo.getBySlugWithBoards(
      db,
      input.workspaceSlug,
    );

    if (!workspace)
      throw new NotFoundException(
        `Workspace with slug ${input.workspaceSlug} not found`,
      );

    // Convert semantic string filters to date ranges expected by the repo
    const dueDateFilters = input.dueDateFilters
      ? convertDueDateFiltersToRanges(input.dueDateFilters)
      : [];

    const result = await boardRepo.getBySlug(
      db,
      input.boardSlug,
      workspace.id,
      {
        members: input.members ?? [],
        labels: input.labels ?? [],
        lists: input.lists ?? [],
        dueDate: dueDateFilters,
      },
    );

    if (!result)
      throw new NotFoundException(
        `Board with slug ${input.boardSlug} not found`,
      );

    return withIsoDueDates(result);
  }

  async create(input: {
    name: string;
    workspacePublicId: string;
    lists: string[];
    labels: string[];
    type?: "regular" | "template";
    sourceBoardPublicId?: string;
    userId: string;
  }) {
    const { userId } = input;
    const workspace = await workspaceRepo.getByPublicId(
      db,
      input.workspacePublicId,
    );

    if (!workspace)
      throw new NotFoundException(
        `Workspace with public ID ${input.workspacePublicId} not found`,
      );

    await assertPermission(db, userId, workspace.id, "board:create");

    // If sourceBoardPublicId is provided, clone the source board
    if (input.sourceBoardPublicId) {
      // First get the source board info (ID and type)
      const sourceBoardInfo =
        await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
          db,
          input.sourceBoardPublicId,
        );

      if (!sourceBoardInfo || sourceBoardInfo.deletedAt)
        throw new NotFoundException(
          `Source board with public ID ${input.sourceBoardPublicId} not found`,
        );

      // Copying a board exposes all of its content, so the caller must be
      // able to see the source board.
      await assertBoardAccess(db, userId, sourceBoardInfo);

      // Get the full board data with the correct type
      const sourceBoard = await boardRepo.getByPublicId(
        db,
        input.sourceBoardPublicId,
        userId,
        {
          members: [],
          labels: [],
          lists: [],
          dueDate: [],
          type: sourceBoardInfo.type,
        },
      );

      if (!sourceBoard)
        throw new NotFoundException(
          `Source board with public ID ${input.sourceBoardPublicId} not found`,
        );

      // Verify the source board belongs to the same workspace
      const sourceWorkspace = await workspaceRepo.getByPublicId(
        db,
        sourceBoard.workspace.publicId,
      );

      if (sourceWorkspace?.id !== workspace.id)
        throw new ForbiddenException(
          `Source board does not belong to this workspace`,
        );

      let slug = generateSlug(input.name);

      const isSlugUnique = await boardRepo.isSlugUnique(db, {
        slug,
        workspaceId: workspace.id,
      });

      if (!isSlugUnique || input.type === "template")
        slug = `${slug}-${generateUID()}`;

      const result = await boardRepo.createFromSnapshot(db, {
        source: sourceBoard,
        workspaceId: workspace.id,
        createdBy: userId,
        slug,
        name: input.name,
        type: input.type ?? "regular",
        sourceBoardId: sourceBoardInfo.id,
      });

      return result;
    }

    // Otherwise, create a new board with provided lists and labels
    let slug = generateSlug(input.name);

    const isSlugUnique = await boardRepo.isSlugUnique(db, {
      slug,
      workspaceId: workspace.id,
    });

    if (!isSlugUnique || input.type === "template")
      slug = `${slug}-${generateUID()}`;

    const result = await boardRepo.create(db, {
      publicId: generateUID(),
      slug,
      name: input.name,
      createdBy: userId,
      workspaceId: workspace.id,
      type: input.type,
    });

    if (!result)
      throw new InternalServerErrorException(`Failed to create board`);

    if (input.lists.length) {
      const listInputs = input.lists.map((list, index) => ({
        publicId: generateUID(),
        name: list,
        boardId: result.id,
        createdBy: userId,
        index,
      }));

      await listRepo.bulkCreate(db, listInputs);
    }

    if (input.labels.length) {
      const labelInputs = input.labels.map((label, index) => ({
        publicId: generateUID(),
        name: label,
        boardId: result.id,
        createdBy: userId,
        colourCode: colours[index % colours.length]?.code ?? "#0d9488",
      }));

      await labelRepo.bulkCreate(db, labelInputs);
    }

    return result;
  }

  async update(input: {
    boardPublicId: string;
    name?: string;
    slug?: string;
    visibility?: "public" | "private";
    favorite?: boolean;
    isArchived?: boolean;
    userId: string;
  }) {
    const { userId } = input;
    const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
      db,
      input.boardPublicId,
    );

    if (!board)
      throw new NotFoundException(
        `Board with public ID ${input.boardPublicId} not found`,
      );

    await assertCanEdit(
      db,
      userId,
      board.workspaceId,
      "board:edit",
      board.createdBy ?? null,
    );
    await assertBoardAccess(db, userId, board);

    // Handle favorite toggle separately
    if (input.favorite !== undefined) {
      if (input.favorite) {
        await boardRepo.addUserFavorite(db, userId, board.id);
      } else {
        await boardRepo.removeUserFavorite(db, userId, board.id);
      }
    }

    // Handle other updates (name, slug, visibility)
    const hasOtherUpdates =
      input.name !== undefined ||
      input.slug !== undefined ||
      input.visibility !== undefined ||
      input.isArchived !== undefined;

    if (!hasOtherUpdates) {
      // Only favorite was updated, return success
      return { success: true };
    }

    if (input.slug) {
      const isBoardSlugAvailable = await boardRepo.isBoardSlugAvailable(
        db,
        input.slug,
        board.workspaceId,
      );

      if (!isBoardSlugAvailable) {
        throw new BadRequestException(
          `Board slug ${input.slug} is not available`,
        );
      }
    }

    const result = await boardRepo.update(db, {
      name: input.name,
      slug: input.slug,
      boardPublicId: input.boardPublicId,
      visibility: input.visibility,
      isArchived: input.isArchived,
    });

    if (!result)
      throw new InternalServerErrorException(`Failed to update board`);

    return result;
  }

  async delete(input: { boardPublicId: string; userId: string }) {
    const { userId } = input;
    const board = await boardRepo.getWithListIdsByPublicId(
      db,
      input.boardPublicId,
    );

    if (!board)
      throw new NotFoundException(
        `Board with public ID ${input.boardPublicId} not found`,
      );

    await assertCanDelete(
      db,
      userId,
      board.workspaceId,
      "board:delete",
      board.createdBy ?? null,
    );
    await assertBoardAccess(db, userId, board);

    const listIds = board.lists.map((list) => list.id);

    const deletedAt = new Date();

    await boardRepo.softDelete(db, {
      boardId: board.id,
      deletedAt,
      deletedBy: userId,
    });

    if (listIds.length) {
      const deletedLists = await listRepo.softDeleteAllByBoardId(db, {
        boardId: board.id,
        deletedAt,
        deletedBy: userId,
      });

      if (!Array.isArray(deletedLists)) {
        throw new InternalServerErrorException(`Failed to delete lists`);
      }

      const deletedCards = await cardRepo.softDeleteAllByListIds(db, {
        listIds,
        deletedAt,
        deletedBy: userId,
      });

      if (!Array.isArray(deletedCards)) {
        throw new InternalServerErrorException(`Failed to delete cards`);
      }

      if (deletedCards.length) {
        const activities = deletedCards.map((card) => ({
          type: "card.archived" as const,
          createdBy: userId,
          cardId: card.id,
        }));

        await activityRepo.bulkCreate(db, activities);
      }
    }

    return { success: true };
  }

  async move(input: {
    boardPublicId: string;
    targetWorkspacePublicId: string;
    userId: string;
  }) {
    const { userId } = input;
    // Get source board
    const board = await boardRepo.getBoardForMove(db, input.boardPublicId);

    if (!board)
      throw new NotFoundException(
        `Board with public ID ${input.boardPublicId} not found`,
      );

    if (board.type === "template")
      throw new BadRequestException(
        `Templates cannot be moved between workspaces`,
      );

    if (board.isArchived)
      throw new BadRequestException(
        `Archived boards cannot be moved. Unarchive the board first.`,
      );

    // Check permission to edit board in source workspace
    await assertCanEdit(
      db,
      userId,
      board.workspaceId,
      "board:edit",
      board.createdBy ?? null,
    );
    await assertBoardAccess(db, userId, board);

    // Get target workspace. workspaceRepo.getByPublicId does not yet
    // filter soft-deleted workspaces (legacy: same is true for several
    // peer callers); guard at this call site so we never move a board
    // into a tombstoned workspace. A wider fix to make the repo treat
    // deleted-as-not-found is a separate concern.
    const targetWorkspace = await workspaceRepo.getByPublicId(
      db,
      input.targetWorkspacePublicId,
    );

    if (!targetWorkspace || targetWorkspace.deletedAt)
      throw new NotFoundException(`Target workspace not found`);

    if (targetWorkspace.id === board.workspaceId)
      throw new BadRequestException(`Board is already in this workspace`);

    // Check permission to create boards in target workspace
    await assertPermission(db, userId, targetWorkspace.id, "board:create");

    let slug = board.slug;

    const isSlugAvailable = await boardRepo.isBoardSlugAvailable(
      db,
      slug,
      targetWorkspace.id,
    );

    if (!isSlugAvailable) {
      slug = `${slug}-${generateUID()}`;
    }

    // Move the board
    await boardRepo.moveToWorkspace(
      db,
      board.id,
      targetWorkspace.id,
      userId,
      slug,
    );

    return { success: true };
  }

  async checkSlugAvailability(input: {
    boardPublicId: string;
    boardSlug: string;
  }) {
    const board = await boardRepo.getWorkspaceAndBoardIdByBoardPublicId(
      db,
      input.boardPublicId,
    );

    if (!board)
      throw new NotFoundException(
        `Board with public ID ${input.boardPublicId} not found`,
      );

    const isBoardSlugAvailable = await boardRepo.isBoardSlugAvailable(
      db,
      input.boardSlug,
      board.workspaceId,
    );

    return {
      isReserved: !isBoardSlugAvailable,
    };
  }
}
