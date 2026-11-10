import { Body, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  CreateLabelDto,
  DeleteLabelResponseDto,
  LabelResponseDto,
  UpdateLabelDto,
} from "./dto/label.dto.js";
import { LabelService } from "./label.service.js";

@AuthenticatedController("Labels", "labels")
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Get(":labelPublicId")
  @ApiOperation({ operationId: "getLabel", summary: "Get a label by public ID" })
  @ApiParam({ name: "labelPublicId" })
  @ApiResponse({ status: 200, type: LabelResponseDto })
  async byPublicId(
    @CurrentUser() user: User,
    @Param("labelPublicId") labelPublicId: string,
  ): Promise<LabelResponseDto> {
    return this.labelService.byPublicId({ labelPublicId, userId: user.id });
  }

  @Post()
  @ApiOperation({ operationId: "createLabel", summary: "Create a label" })
  @ApiResponse({ status: 201, type: LabelResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() input: CreateLabelDto,
  ): Promise<LabelResponseDto> {
    return this.labelService.create({
      name: input.name,
      boardPublicId: input.boardPublicId,
      colourCode: input.colourCode,
      userId: user.id,
    });
  }

  @Put(":labelPublicId")
  @ApiOperation({ operationId: "updateLabel", summary: "Update a label" })
  @ApiParam({ name: "labelPublicId" })
  @ApiResponse({ status: 200, type: LabelResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("labelPublicId") labelPublicId: string,
    @Body() input: UpdateLabelDto,
  ): Promise<LabelResponseDto> {
    return this.labelService.update({
      labelPublicId,
      name: input.name,
      colourCode: input.colourCode,
      userId: user.id,
    });
  }

  @Delete(":labelPublicId")
  @ApiOperation({ operationId: "deleteLabel", summary: "Delete a label" })
  @ApiParam({ name: "labelPublicId" })
  @ApiResponse({ status: 200, type: DeleteLabelResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("labelPublicId") labelPublicId: string,
  ): Promise<DeleteLabelResponseDto> {
    return this.labelService.delete({ labelPublicId, userId: user.id });
  }
}
