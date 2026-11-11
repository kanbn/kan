import { Body, Delete, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiParam } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { ChecklistService } from "./checklist.service.js";
import {
  ChecklistItemResponseDto,
  ChecklistResponseDto,
  CreateChecklistDto,
  CreateChecklistItemDto,
  DeleteChecklistResponseDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
} from "./dto/checklist.dto.js";

@AuthenticatedController("Cards", "cards")
export class CardChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Post(":cardPublicId/checklists")
  @ApiOperation({
    operationId: "createChecklist",
    summary: "Add a checklist to a card",
  })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 201, type: ChecklistResponseDto })
  async create(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Body() input: CreateChecklistDto,
  ): Promise<ChecklistResponseDto> {
    return this.checklistService.create({
      cardPublicId,
      name: input.name,
      userId: user.id,
    });
  }
}

@AuthenticatedController("Cards", "checklists")
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Put(":checklistPublicId")
  @ApiOperation({
    operationId: "updateChecklist",
    summary: "Update a checklist",
  })
  @ApiParam({ name: "checklistPublicId" })
  @ZodResponse({ status: 200, type: ChecklistResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("checklistPublicId") checklistPublicId: string,
    @Body() input: UpdateChecklistDto,
  ): Promise<ChecklistResponseDto> {
    return this.checklistService.update({
      checklistPublicId,
      name: input.name,
      userId: user.id,
    });
  }

  @Delete(":checklistPublicId")
  @ApiOperation({
    operationId: "deleteChecklist",
    summary: "Delete a checklist",
  })
  @ApiParam({ name: "checklistPublicId" })
  @ZodResponse({ status: 200, type: DeleteChecklistResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("checklistPublicId") checklistPublicId: string,
  ): Promise<DeleteChecklistResponseDto> {
    return this.checklistService.delete({
      checklistPublicId,
      userId: user.id,
    });
  }

  @Post(":checklistPublicId/items")
  @ApiOperation({
    operationId: "createChecklistItem",
    summary: "Add an item to a checklist",
  })
  @ApiParam({ name: "checklistPublicId" })
  @ZodResponse({ status: 201, type: ChecklistItemResponseDto })
  async createItem(
    @CurrentUser() user: User,
    @Param("checklistPublicId") checklistPublicId: string,
    @Body() input: CreateChecklistItemDto,
  ): Promise<ChecklistItemResponseDto> {
    return this.checklistService.createItem({
      checklistPublicId,
      title: input.title,
      userId: user.id,
    });
  }

  @Patch("items/:checklistItemPublicId")
  @ApiOperation({
    operationId: "updateChecklistItem",
    summary: "Update a checklist item",
  })
  @ApiParam({ name: "checklistItemPublicId" })
  @ZodResponse({ status: 200, type: ChecklistItemResponseDto })
  async updateItem(
    @CurrentUser() user: User,
    @Param("checklistItemPublicId") checklistItemPublicId: string,
    @Body() input: UpdateChecklistItemDto,
  ): Promise<ChecklistItemResponseDto> {
    return this.checklistService.updateItem({
      checklistItemPublicId,
      userId: user.id,
      title: input.title,
      completed: input.completed,
      index: input.index,
    });
  }

  @Delete("items/:checklistItemPublicId")
  @ApiOperation({
    operationId: "deleteChecklistItem",
    summary: "Delete a checklist item",
  })
  @ApiParam({ name: "checklistItemPublicId" })
  @ZodResponse({ status: 200, type: DeleteChecklistResponseDto })
  async deleteItem(
    @CurrentUser() user: User,
    @Param("checklistItemPublicId") checklistItemPublicId: string,
  ): Promise<DeleteChecklistResponseDto> {
    return this.checklistService.deleteItem({
      checklistItemPublicId,
      userId: user.id,
    });
  }
}
