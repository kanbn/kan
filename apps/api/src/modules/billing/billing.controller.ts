import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { BillingService } from "./billing.service.js";
import {
  CreateCheckoutSessionDto,
  SessionUrlResponseDto,
} from "./dto/billing.dto.js";

@ApiExcludeController()
@AuthenticatedController("Billing", "billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout-session")
  @HttpCode(200)
  @ZodResponse({ status: 200, type: SessionUrlResponseDto })
  async checkout(
    @CurrentUser() user: User,
    @Body() input: CreateCheckoutSessionDto,
  ): Promise<SessionUrlResponseDto> {
    return this.billingService.createCheckoutSession(user, input);
  }

  @Post("portal-session")
  @HttpCode(200)
  @ZodResponse({ status: 200, type: SessionUrlResponseDto })
  async portal(@CurrentUser() user: User): Promise<SessionUrlResponseDto> {
    return this.billingService.createPortalSession(user.id);
  }
}

@ApiExcludeController()
@Controller("stripe")
export class StripeWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature?: string,
  ) {
    if (!signature || !req.rawBody)
      throw new BadRequestException("No signature found");
    await this.billingService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
