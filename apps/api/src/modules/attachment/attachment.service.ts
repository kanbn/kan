import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import {
  assertBoardAccess,
  assertPermission,
} from "@kan/server/utils/permissions";
import {
  deleteObject,
  generateUID,
  generateUploadUrl,
} from "@kan/shared/utils";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

const log = createLogger("attachment");

const getBucket = () => process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME;

@Injectable()
export class AttachmentService {
  private async assertCanEditCard(cardPublicId: string, userId: string) {
    const card = await assertFound(
      cardRepo.getWorkspaceAndCardIdByCardPublicId(db, cardPublicId),
      `Card with public ID ${cardPublicId} not found`,
    );

    await assertPermission(db, userId, card.workspaceId, "card:edit");
    await assertBoardAccess(db, userId, {
      id: card.boardId,
      workspaceId: card.workspaceId,
      type: card.boardType,
    });

    return card;
  }

  async generateUploadUrl(input: {
    cardPublicId: string;
    filename: string;
    contentType: string;
    userId: string;
  }) {
    const card = await this.assertCanEditCard(input.cardPublicId, input.userId);
    const workspace = await assertFound(
      workspaceRepo.getById(db, card.workspaceId),
      `Workspace not found`,
    );

    const bucket = getBucket();
    if (!bucket)
      throw new InternalServerErrorException(
        `Attachments bucket not configured`,
      );

    const sanitizedFilename = input.filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .substring(0, 200);
    const key = `${workspace.publicId}/${input.cardPublicId}/${generateUID()}-${sanitizedFilename}`;

    const url = await generateUploadUrl(bucket, key, input.contentType, 3600);

    return { url, key };
  }

  async confirm(input: {
    cardPublicId: string;
    s3Key: string;
    filename: string;
    originalFilename: string;
    contentType: string;
    size: number;
    userId: string;
  }) {
    const card = await this.assertCanEditCard(input.cardPublicId, input.userId);

    const attachment = await cardAttachmentRepo.create(db, {
      cardId: card.id,
      filename: input.filename,
      originalFilename: input.originalFilename,
      contentType: input.contentType,
      size: input.size,
      s3Key: input.s3Key,
      createdBy: input.userId,
    });

    if (!attachment)
      throw new InternalServerErrorException("Failed to create attachment");

    await cardActivityRepo.create(db, {
      type: "card.updated.attachment.added",
      cardId: card.id,
      attachmentId: attachment.id,
      toTitle: input.originalFilename,
      createdBy: input.userId,
    });

    return {
      publicId: attachment.publicId,
      filename: attachment.filename,
      originalFilename: attachment.originalFilename,
      contentType: attachment.contentType,
      size: attachment.size,
      s3Key: attachment.s3Key,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  async delete(input: { attachmentPublicId: string; userId: string }) {
    const attachment = await cardAttachmentRepo.getByPublicId(
      db,
      input.attachmentPublicId,
    );

    if (!attachment || attachment.deletedAt)
      throw new NotFoundException(
        `Attachment with public ID ${input.attachmentPublicId} not found`,
      );

    const board = attachment.card.list.board;
    await assertPermission(db, input.userId, board.workspaceId, "card:edit");
    await assertBoardAccess(db, input.userId, {
      id: board.id,
      workspaceId: board.workspaceId,
      type: board.type,
    });

    const bucket = getBucket();
    if (bucket) {
      try {
        await deleteObject(bucket, attachment.s3Key);
      } catch (error) {
        log.error(
          { err: error, s3Key: attachment.s3Key },
          "Failed to delete attachment from S3",
        );
      }
    }

    await cardAttachmentRepo.softDelete(db, {
      attachmentId: attachment.id,
      deletedAt: new Date(),
    });

    await cardActivityRepo.create(db, {
      type: "card.updated.attachment.removed",
      cardId: attachment.cardId,
      attachmentId: attachment.id,
      fromTitle: attachment.originalFilename,
      createdBy: input.userId,
    });

    return { success: true };
  }
}
