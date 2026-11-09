import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import type { User } from "../../common/interfaces/user.interface.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import {
  CreateFeedbackDto,
  CreateFeedbackResponseDto,
} from "./dto/create-feedback.dto.js";
import { FeedbackService } from "./feedback.service.js";

@ApiTags("Feedback")
@ApiBearerAuth("bearer")
@Controller("feedback")
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ operationId: "createFeedback", summary: "Submit feedback" })
  @ApiResponse({ status: 201, type: CreateFeedbackResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body() input: CreateFeedbackDto,
  ): Promise<CreateFeedbackResponseDto> {
    return this.feedbackService.create({
      feedback: input.feedback,
      url: input.url,
      userId: user.id,
    });
  }
}
