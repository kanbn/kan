import type { Request } from "express";
import { Body, Delete, Param, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiParam } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  ApiRawUpload,
  readUploadHeaders,
} from "../../common/raw-upload.util.js";
import { AttachmentService } from "./attachment.service.js";
import {
  AttachmentResponseDto,
  ConfirmAttachmentDto,
  DeleteAttachmentResponseDto,
  GenerateUploadUrlDto,
  UploadUrlResponseDto,
} from "./dto/attachment.dto.js";

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

@AuthenticatedController("Attachments", "cards/:cardPublicId/attachments")
export class CardAttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post()
  @ApiOperation({
    operationId: "uploadAttachment",
    summary: "Upload a file and attach it to a card",
  })
  @ApiParam({ name: "cardPublicId" })
  @ApiRawUpload()
  @ZodResponse({ status: 201, type: AttachmentResponseDto })
  async upload(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Req() req: Request,
  ): Promise<AttachmentResponseDto> {
    const file = readUploadHeaders(req, MAX_ATTACHMENT_BYTES);
    return this.attachmentService.upload({
      cardPublicId,
      body: req,
      ...file,
      userId: user.id,
    });
  }

  @Post("upload-url")
  @ApiOperation({
    operationId: "generateAttachmentUploadUrl",
    summary: "Generate a presigned URL for uploading an attachment",
  })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 201, type: UploadUrlResponseDto })
  async generateUploadUrl(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Body() input: GenerateUploadUrlDto,
  ): Promise<UploadUrlResponseDto> {
    return this.attachmentService.generateUploadUrl({
      cardPublicId,
      filename: input.filename,
      contentType: input.contentType,
      userId: user.id,
    });
  }

  @Post("confirm")
  @ApiOperation({
    operationId: "confirmAttachment",
    summary: "Confirm an attachment upload and save it to the card",
  })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 201, type: AttachmentResponseDto })
  async confirm(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Body() input: ConfirmAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentService.confirm({
      cardPublicId,
      ...input,
      userId: user.id,
    });
  }
}

@AuthenticatedController("Attachments", "attachments")
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Delete(":attachmentPublicId")
  @ApiOperation({
    operationId: "deleteAttachment",
    summary: "Delete an attachment",
  })
  @ApiParam({ name: "attachmentPublicId" })
  @ZodResponse({ status: 200, type: DeleteAttachmentResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("attachmentPublicId") attachmentPublicId: string,
  ): Promise<DeleteAttachmentResponseDto> {
    return this.attachmentService.delete({
      attachmentPublicId,
      userId: user.id,
    });
  }
}
