import { Body, Delete, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  CreateListDto,
  DeleteListResponseDto,
  ListResponseDto,
  UpdateListDto,
} from "./dto/list.dto.js";
import { ListService } from "./list.service.js";

@AuthenticatedController("Lists", "lists")
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Post()
  @ApiOperation({ operationId: "createList", summary: "Create a list" })
  @ApiResponse({ status: 201, type: ListResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() input: CreateListDto,
  ): Promise<ListResponseDto> {
    return this.listService.create({
      name: input.name,
      boardPublicId: input.boardPublicId,
      userId: user.id,
    });
  }

  @Delete(":listPublicId")
  @ApiOperation({ operationId: "deleteList", summary: "Delete a list" })
  @ApiParam({ name: "listPublicId" })
  @ApiResponse({ status: 200, type: DeleteListResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("listPublicId") listPublicId: string,
  ): Promise<DeleteListResponseDto> {
    return this.listService.delete({ listPublicId, userId: user.id });
  }

  @Put(":listPublicId")
  @ApiOperation({ operationId: "updateList", summary: "Update a list" })
  @ApiParam({ name: "listPublicId" })
  @ApiResponse({ status: 200, type: ListResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("listPublicId") listPublicId: string,
    @Body() input: UpdateListDto,
  ): Promise<ListResponseDto> {
    return this.listService.update({
      listPublicId,
      userId: user.id,
      name: input.name,
      index: input.index,
    });
  }
}
