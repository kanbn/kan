import { Injectable, InternalServerErrorException } from "@nestjs/common";

import {
  assertBoardAccess,
  assertCanDelete,
  assertCanEdit,
  assertPermission,
} from "@kan/api/utils/permissions";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as listRepo from "@kan/db/repository/list.repo";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

@Injectable()
export class ListService {
  async create(input: {
    name: string;
    boardPublicId: string;
    userId: string;
  }) {
    const board = await assertFound(
      boardRepo.getWorkspaceAndBoardIdByBoardPublicId(db, input.boardPublicId),
      `Board with public ID ${input.boardPublicId} not found`,
    );

    await assertPermission(db, input.userId, board.workspaceId, "list:create");
    await assertBoardAccess(db, input.userId, board);

    return listRepo.create(db, {
      name: input.name,
      createdBy: input.userId,
      boardId: board.id,
    });
  }

  async delete(input: { listPublicId: string; userId: string }) {
    const list = await assertFound(
      listRepo.getWorkspaceAndListIdByListPublicId(db, input.listPublicId),
      `List with public ID ${input.listPublicId} not found`,
    );

    await assertCanDelete(
      db,
      input.userId,
      list.workspaceId,
      "list:delete",
      list.createdBy,
    );
    await assertBoardAccess(db, input.userId, {
      id: list.boardId,
      workspaceId: list.workspaceId,
      type: list.boardType,
    });

    const deletedAt = new Date();

    await listRepo.softDeleteById(db, {
      listId: list.id,
      deletedAt,
      deletedBy: input.userId,
    });

    const deletedCards = await cardRepo.softDeleteAllByListIds(db, {
      listIds: [list.id],
      deletedAt,
      deletedBy: input.userId,
    });

    const activities = deletedCards.map((card) => ({
      type: "card.archived" as const,
      createdBy: input.userId,
      cardId: card.id,
    }));

    if (activities.length) await activityRepo.bulkCreate(db, activities);

    return { success: true };
  }

  async update(input: {
    listPublicId: string;
    userId: string;
    name?: string;
    index?: number;
  }) {
    const list = await assertFound(
      listRepo.getWorkspaceAndListIdByListPublicId(db, input.listPublicId),
      `List with public ID ${input.listPublicId} not found`,
    );

    await assertCanEdit(
      db,
      input.userId,
      list.workspaceId,
      "list:edit",
      list.createdBy,
    );
    await assertBoardAccess(db, input.userId, {
      id: list.boardId,
      workspaceId: list.workspaceId,
      type: list.boardType,
    });

    let result: { name: string; publicId: string } | undefined;

    if (input.name) {
      result = await listRepo.update(
        db,
        { name: input.name },
        { listPublicId: input.listPublicId },
      );
    }

    if (input.index !== undefined) {
      result = await listRepo.reorder(db, {
        listPublicId: input.listPublicId,
        newIndex: input.index,
      });
    }

    if (!result)
      throw new InternalServerErrorException("Failed to update list");

    return result;
  }
}
