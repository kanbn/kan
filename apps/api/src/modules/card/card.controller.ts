import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard.js";
import { CardService } from "./card.service.js";
import {
  ActivitiesQueryDto,
  ActivitiesResponseDto,
  CardDetailDto,
  CardUpdateResponseDto,
  CommentDto,
  CommentResponseDto,
  CreateCardDto,
  DuplicateCardDto,
  PublicIdResponseDto,
  SuccessResponseDto,
  ToggleLabelResponseDto,
  ToggleMemberResponseDto,
  UpdateCardDto,
} from "./dto/card.dto.js";

@AuthenticatedController("Cards", "cards")
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @ApiOperation({ operationId: "createCard", summary: "Create a card" })
  @ZodResponse({ status: 201, type: PublicIdResponseDto })
  async create(@CurrentUser() user: User, @Body() input: CreateCardDto) {
    return this.cardService.create({
      ...input,
      userId: user.id,
      userName: user.name,
    });
  }

  @Put(":cardPublicId")
  @ApiOperation({ operationId: "updateCard", summary: "Update a card" })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 200, type: CardUpdateResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Body() input: UpdateCardDto,
  ) {
    return this.cardService.update({
      cardPublicId,
      ...input,
      userId: user.id,
      userName: user.name,
    });
  }

  @Delete(":cardPublicId")
  @ApiOperation({ operationId: "deleteCard", summary: "Delete a card" })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 200, type: SuccessResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
  ) {
    return this.cardService.delete({
      cardPublicId,
      userId: user.id,
      userName: user.name,
    });
  }

  @Post(":cardPublicId/duplicate")
  @ApiOperation({ operationId: "duplicateCard", summary: "Duplicate a card" })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 201, type: PublicIdResponseDto })
  async duplicate(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Body() input: DuplicateCardDto,
  ) {
    return this.cardService.duplicate({
      cardPublicId,
      ...input,
      userId: user.id,
    });
  }

  @Post(":cardPublicId/comments")
  @ApiOperation({ operationId: "addCardComment", summary: "Add a comment" })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 201, type: CommentResponseDto })
  async addComment(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Body() input: CommentDto,
  ) {
    return this.cardService.addComment({
      cardPublicId,
      comment: input.comment,
      userId: user.id,
    });
  }

  @Put(":cardPublicId/comments/:commentPublicId")
  @ApiOperation({
    operationId: "updateCardComment",
    summary: "Update a comment",
  })
  @ApiParam({ name: "cardPublicId" })
  @ApiParam({ name: "commentPublicId" })
  @ZodResponse({ status: 200, type: CommentResponseDto })
  async updateComment(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Param("commentPublicId") commentPublicId: string,
    @Body() input: CommentDto,
  ) {
    return this.cardService.updateComment({
      cardPublicId,
      commentPublicId,
      comment: input.comment,
      userId: user.id,
    });
  }

  @Delete(":cardPublicId/comments/:commentPublicId")
  @ApiOperation({
    operationId: "deleteCardComment",
    summary: "Delete a comment",
  })
  @ApiParam({ name: "cardPublicId" })
  @ApiParam({ name: "commentPublicId" })
  @ZodResponse({ status: 200, type: PublicIdResponseDto })
  async deleteComment(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Param("commentPublicId") commentPublicId: string,
  ) {
    return this.cardService.deleteComment({
      cardPublicId,
      commentPublicId,
      userId: user.id,
    });
  }

  @Put(":cardPublicId/labels/:labelPublicId")
  @ApiOperation({
    operationId: "toggleCardLabel",
    summary: "Add or remove a label on a card",
  })
  @ApiParam({ name: "cardPublicId" })
  @ApiParam({ name: "labelPublicId" })
  @ZodResponse({ status: 200, type: ToggleLabelResponseDto })
  async addOrRemoveLabel(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Param("labelPublicId") labelPublicId: string,
  ) {
    return this.cardService.addOrRemoveLabel({
      cardPublicId,
      labelPublicId,
      userId: user.id,
    });
  }

  @Put(":cardPublicId/members/:workspaceMemberPublicId")
  @ApiOperation({
    operationId: "toggleCardMember",
    summary: "Add or remove a member on a card",
  })
  @ApiParam({ name: "cardPublicId" })
  @ApiParam({ name: "workspaceMemberPublicId" })
  @ZodResponse({ status: 200, type: ToggleMemberResponseDto })
  async addOrRemoveMember(
    @CurrentUser() user: User,
    @Param("cardPublicId") cardPublicId: string,
    @Param("workspaceMemberPublicId") workspaceMemberPublicId: string,
  ) {
    return this.cardService.addOrRemoveMember({
      cardPublicId,
      workspaceMemberPublicId,
      userId: user.id,
    });
  }
}

// Cards on public boards are readable anonymously; for private boards the
// service requires a user with card:view and board access.
@ApiTags("Cards")
@UseGuards(OptionalAuthGuard)
@Controller("cards")
export class CardReadController {
  constructor(private readonly cardService: CardService) {}

  @Get(":cardPublicId")
  @ApiOperation({ operationId: "getCard", summary: "Get a card by public ID" })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 200, type: CardDetailDto })
  async byId(
    @CurrentUser() user: User | undefined,
    @Param("cardPublicId") cardPublicId: string,
  ) {
    return this.cardService.byId({ cardPublicId, userId: user?.id });
  }

  @Get(":cardPublicId/activities")
  @ApiOperation({
    operationId: "getCardActivities",
    summary: "Get a card's activities, paginated",
  })
  @ApiParam({ name: "cardPublicId" })
  @ZodResponse({ status: 200, type: ActivitiesResponseDto })
  async getActivities(
    @CurrentUser() user: User | undefined,
    @Param("cardPublicId") cardPublicId: string,
    @Query() query: ActivitiesQueryDto,
  ) {
    return this.cardService.getActivities({
      cardPublicId,
      ...query,
      userId: user?.id,
    });
  }
}
