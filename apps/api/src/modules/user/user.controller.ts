import type { Request } from "express";
import { Body, Get, Post, Put, Req } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { AuthenticatedRequest } from "../../common/interfaces/request.interface.js";
import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  ApiRawUpload,
  readUploadHeaders,
} from "../../common/raw-upload.util.js";
import { headersFromRaw } from "../../common/session.util.js";
import {
  SetPasswordDto,
  SuccessResponseDto,
  UpdateUserDto,
  UpdateUserResponseDto,
  UserResponseDto,
} from "./dto/user.dto.js";
import { UserService } from "./user.service.js";

const maxAvatarBytes = () =>
  Number.parseInt(process.env.S3_AVATAR_UPLOAD_LIMIT ?? "2097152", 10);

@AuthenticatedController("Users", "users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  @ApiOperation({ operationId: "getUser", summary: "Get the current user" })
  @ZodResponse({ status: 200, type: UserResponseDto })
  async getUser(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.userService.getUser({ userId: user.id });
  }

  @Put()
  @ApiOperation({
    operationId: "updateUser",
    summary: "Update the current user",
  })
  @ZodResponse({ status: 200, type: UpdateUserResponseDto })
  async update(
    @CurrentUser() user: User,
    @Body() input: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    return this.userService.update({
      userId: user.id,
      name: input.name,
      image: input.image,
    });
  }

  @Post("me/password")
  @ApiOperation({
    operationId: "setPassword",
    summary: "Set a password for a user who has none yet",
  })
  @ZodResponse({ status: 201, type: SuccessResponseDto })
  async setPassword(
    @CurrentUser() user: User,
    @Body() input: SetPasswordDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SuccessResponseDto> {
    return this.userService.setPassword({
      userId: user.id,
      newPassword: input.newPassword,
      headers: headersFromRaw(req.headers),
    });
  }

  @Post("me/avatar")
  @ApiOperation({
    operationId: "uploadAvatar",
    summary: "Upload a new profile image for the current user",
  })
  @ApiRawUpload()
  @ZodResponse({ status: 201, type: SuccessResponseDto })
  async uploadAvatar(
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<SuccessResponseDto> {
    const maxBytes = maxAvatarBytes();
    const { filename, contentType } = readUploadHeaders(req, maxBytes);
    return this.userService.uploadAvatar({
      userId: user.id,
      body: req,
      filename,
      contentType,
      maxBytes,
    });
  }
}
