import { Injectable, InternalServerErrorException } from "@nestjs/common";

import * as boardLabelRepo from "@kan/db/repository/boardLabel.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { assertPermission } from "@kan/server/utils/permissions";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

@Injectable()
export class BoardLabelService {
  private async workspaceId(workspacePublicId: string) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, workspacePublicId),
      `Workspace with public ID ${workspacePublicId} not found`,
    );
    return workspace.id;
  }

  private label(boardLabelPublicId: string) {
    return assertFound(
      boardLabelRepo.getByPublicId(db, boardLabelPublicId),
      `Board label with public ID ${boardLabelPublicId} not found`,
    );
  }

  async all(input: { workspacePublicId: string; userId: string }) {
    const workspaceId = await this.workspaceId(input.workspacePublicId);
    await assertPermission(db, input.userId, workspaceId, "board:view");
    return boardLabelRepo.getAllByWorkspaceId(db, workspaceId);
  }

  async create(input: {
    workspacePublicId: string;
    name: string;
    colourCode: string;
    userId: string;
  }) {
    const workspaceId = await this.workspaceId(input.workspacePublicId);
    await assertPermission(db, input.userId, workspaceId, "board:edit");
    const result = await boardLabelRepo.create(db, {
      name: input.name,
      colourCode: input.colourCode,
      workspaceId,
      createdBy: input.userId,
    });
    if (!result)
      throw new InternalServerErrorException("Failed to create board label");
    return result;
  }

  async update(input: {
    boardLabelPublicId: string;
    name: string;
    colourCode: string;
    userId: string;
  }) {
    const label = await this.label(input.boardLabelPublicId);
    await assertPermission(db, input.userId, label.workspaceId, "board:edit");
    const result = await boardLabelRepo.update(db, label.id, {
      name: input.name,
      colourCode: input.colourCode,
    });
    if (!result)
      throw new InternalServerErrorException("Failed to update board label");
    return result;
  }

  async delete(input: { boardLabelPublicId: string; userId: string }) {
    const label = await this.label(input.boardLabelPublicId);
    await assertPermission(db, input.userId, label.workspaceId, "board:edit");
    await boardLabelRepo.softDelete(db, label.id, input.userId);
    return { success: true };
  }
}
