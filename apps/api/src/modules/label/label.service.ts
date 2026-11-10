import { Injectable, InternalServerErrorException } from "@nestjs/common";

import { assertBoardAccess, assertPermission } from "@kan/api/utils/permissions";
import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as labelRepo from "@kan/db/repository/label.repo";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

@Injectable()
export class LabelService {
  async byPublicId(input: { labelPublicId: string; userId: string }) {
    const label = await assertFound(
      labelRepo.getWorkspaceAndLabelIdByLabelPublicId(db, input.labelPublicId),
      `Label with public ID ${input.labelPublicId} not found`,
    );

    await assertPermission(db, input.userId, label.workspaceId, "board:view");
    await assertBoardAccess(db, input.userId, {
      id: label.boardId,
      workspaceId: label.workspaceId,
      type: label.boardType,
    });

    const result = await assertFound(
      labelRepo.getByPublicId(db, input.labelPublicId),
      `Label with public ID ${input.labelPublicId} not found`,
    );

    return {
      publicId: result.publicId,
      name: result.name,
      colourCode: result.colourCode,
    };
  }

  async create(input: {
    name: string;
    boardPublicId: string;
    colourCode: string;
    userId: string;
  }) {
    const board = await assertFound(
      boardRepo.getWorkspaceAndBoardIdByBoardPublicId(db, input.boardPublicId),
      `Board with public ID ${input.boardPublicId} not found`,
    );

    await assertPermission(db, input.userId, board.workspaceId, "board:edit");
    await assertBoardAccess(db, input.userId, board);

    const result = await labelRepo.create(db, {
      name: input.name,
      colourCode: input.colourCode,
      createdBy: input.userId,
      boardId: board.id,
    });

    if (!result) throw new InternalServerErrorException("Failed to create label");

    return {
      publicId: result.publicId,
      name: result.name,
      colourCode: result.colourCode,
    };
  }

  async update(input: {
    labelPublicId: string;
    name: string;
    colourCode: string;
    userId: string;
  }) {
    const label = await assertFound(
      labelRepo.getWorkspaceAndLabelIdByLabelPublicId(db, input.labelPublicId),
      `Label with public ID ${input.labelPublicId} not found`,
    );

    await assertPermission(db, input.userId, label.workspaceId, "board:edit");
    await assertBoardAccess(db, input.userId, {
      id: label.boardId,
      workspaceId: label.workspaceId,
      type: label.boardType,
    });

    const result = await labelRepo.update(db, {
      labelPublicId: input.labelPublicId,
      name: input.name,
      colourCode: input.colourCode,
    });

    if (!result) throw new InternalServerErrorException("Failed to update label");

    return {
      publicId: result.publicId,
      name: result.name,
      colourCode: result.colourCode,
    };
  }

  async delete(input: { labelPublicId: string; userId: string }) {
    const label = await assertFound(
      labelRepo.getWorkspaceAndLabelIdByLabelPublicId(db, input.labelPublicId),
      `Label with public ID ${input.labelPublicId} not found`,
    );

    await assertPermission(db, input.userId, label.workspaceId, "board:edit");
    await assertBoardAccess(db, input.userId, {
      id: label.boardId,
      workspaceId: label.workspaceId,
      type: label.boardType,
    });

    await cardRepo.hardDeleteAllCardLabelRelationships(db, label.id);

    await labelRepo.softDelete(db, {
      labelId: label.id,
      deletedAt: new Date(),
      deletedBy: input.userId,
    });

    return { success: true };
  }
}
