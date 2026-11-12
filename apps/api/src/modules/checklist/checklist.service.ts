import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

import {
  assertBoardAccess,
  assertPermission,
} from "@kan/api/utils/permissions";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as activityRepo from "@kan/db/repository/cardActivity.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

@Injectable()
export class ChecklistService {
  async create(input: { cardPublicId: string; name: string; userId: string }) {
    const card = await assertFound(
      cardRepo.getWorkspaceAndCardIdByCardPublicId(db, input.cardPublicId),
      `Card with public ID ${input.cardPublicId} not found`,
    );

    await assertPermission(db, input.userId, card.workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    const checklist = await checklistRepo.create(db, {
      name: input.name,
      createdBy: input.userId,
      cardId: card.id,
    });

    if (!checklist?.id)
      throw new InternalServerErrorException("Failed to create checklist");

    await activityRepo.create(db, {
      type: "card.updated.checklist.added",
      cardId: card.id,
      toTitle: checklist.name,
      createdBy: input.userId,
    });

    return checklist;
  }

  async update(input: {
    checklistPublicId: string;
    name: string;
    userId: string;
  }) {
    const checklist = await assertFound(
      checklistRepo.getChecklistByPublicId(db, input.checklistPublicId),
      `Checklist with public ID ${input.checklistPublicId} not found`,
    );

    const workspaceId = checklist.card.list.board.workspace.id;

    await assertPermission(db, input.userId, workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: checklist.card.list.board.id,
      workspaceId,
      type: checklist.card.list.board.type,
    });

    const previousName = checklist.name;

    const updated = await checklistRepo.updateChecklistById(db, {
      id: checklist.id,
      name: input.name,
    });

    if (!updated)
      throw new InternalServerErrorException("Failed to update checklist");

    await activityRepo.create(db, {
      type: "card.updated.checklist.renamed",
      cardId: checklist.cardId,
      fromTitle: previousName,
      toTitle: updated.name,
      createdBy: input.userId,
    });

    return updated;
  }

  async delete(input: { checklistPublicId: string; userId: string }) {
    const checklist = await assertFound(
      checklistRepo.getChecklistByPublicId(db, input.checklistPublicId),
      `Checklist with public ID ${input.checklistPublicId} not found`,
    );

    const workspaceId = checklist.card.list.board.workspace.id;

    await assertPermission(db, input.userId, workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: checklist.card.list.board.id,
      workspaceId,
      type: checklist.card.list.board.type,
    });

    const deletedAt = new Date();

    await checklistRepo.softDeleteAllItemsByChecklistId(db, {
      checklistId: checklist.id,
      deletedAt,
      deletedBy: input.userId,
    });

    const deleted = await checklistRepo.softDeleteById(db, {
      id: checklist.id,
      deletedAt,
      deletedBy: input.userId,
    });

    if (!deleted)
      throw new InternalServerErrorException("Failed to delete checklist");

    await activityRepo.create(db, {
      type: "card.updated.checklist.deleted",
      cardId: checklist.cardId,
      fromTitle: checklist.name,
      createdBy: input.userId,
    });

    return { success: true };
  }

  async createItem(input: {
    checklistPublicId: string;
    title: string;
    userId: string;
  }) {
    const checklist = await assertFound(
      checklistRepo.getChecklistByPublicId(db, input.checklistPublicId),
      `Checklist with public ID ${input.checklistPublicId} not found`,
    );

    const workspaceId = checklist.card.list.board.workspace.id;

    await assertPermission(db, input.userId, workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: checklist.card.list.board.id,
      workspaceId,
      type: checklist.card.list.board.type,
    });

    const item = await checklistRepo.createItem(db, {
      title: input.title,
      createdBy: input.userId,
      checklistId: checklist.id,
    });

    if (!item?.id)
      throw new InternalServerErrorException("Failed to create checklist item");

    await activityRepo.create(db, {
      type: "card.updated.checklist.item.added",
      cardId: checklist.cardId,
      toTitle: item.title,
      createdBy: input.userId,
    });

    return item;
  }

  async updateItem(input: {
    checklistItemPublicId: string;
    userId: string;
    title?: string;
    completed?: boolean;
    index?: number;
  }) {
    if (
      input.title === undefined &&
      input.completed === undefined &&
      input.index === undefined
    )
      throw new BadRequestException(
        "At least one of title, completed, or index must be provided",
      );

    const item = await assertFound(
      checklistRepo.getChecklistItemByPublicIdWithChecklist(
        db,
        input.checklistItemPublicId,
      ),
      `Checklist item with public ID ${input.checklistItemPublicId} not found`,
    );

    const workspaceId = item.checklist.card.list.board.workspace.id;

    await assertPermission(db, input.userId, workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: item.checklist.card.list.board.id,
      workspaceId,
      type: item.checklist.card.list.board.type,
    });

    const previousTitle = item.title;

    let updatedItem;

    if (input.title !== undefined || input.completed !== undefined) {
      updatedItem = await checklistRepo.updateItemById(db, {
        id: item.id,
        title: input.title,
        completed: input.completed,
      });
    }

    if (input.index !== undefined) {
      updatedItem = await checklistRepo.reorderItem(db, {
        itemId: item.id,
        newIndex: input.index,
      });
    }

    if (!updatedItem)
      throw new InternalServerErrorException("Failed to update checklist item");

    if (input.completed !== undefined) {
      await activityRepo.create(db, {
        type: input.completed
          ? "card.updated.checklist.item.completed"
          : "card.updated.checklist.item.uncompleted",
        cardId: item.checklist.cardId,
        toTitle: updatedItem.title,
        createdBy: input.userId,
      });
    }

    if (input.title !== undefined && input.title !== previousTitle) {
      await activityRepo.create(db, {
        type: "card.updated.checklist.item.updated",
        cardId: item.checklist.cardId,
        fromTitle: previousTitle,
        toTitle: updatedItem.title,
        createdBy: input.userId,
      });
    }

    return updatedItem;
  }

  async deleteItem(input: { checklistItemPublicId: string; userId: string }) {
    const item = await assertFound(
      checklistRepo.getChecklistItemByPublicIdWithChecklist(
        db,
        input.checklistItemPublicId,
      ),
      `Checklist item with public ID ${input.checklistItemPublicId} not found`,
    );

    const workspaceId = item.checklist.card.list.board.workspace.id;

    await assertPermission(db, input.userId, workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: item.checklist.card.list.board.id,
      workspaceId,
      type: item.checklist.card.list.board.type,
    });

    const deleted = await checklistRepo.softDeleteItemById(db, {
      id: item.id,
      deletedAt: new Date(),
      deletedBy: input.userId,
    });

    if (!deleted)
      throw new InternalServerErrorException("Failed to delete checklist item");

    await activityRepo.create(db, {
      type: "card.updated.checklist.item.deleted",
      cardId: item.checklist.cardId,
      fromTitle: item.title,
      createdBy: input.userId,
    });

    return { success: true };
  }
}
