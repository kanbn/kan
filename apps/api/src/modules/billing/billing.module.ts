import { Module } from "@nestjs/common";

import {
  BillingController,
  StripeWebhookController,
} from "./billing.controller.js";
import { BillingService } from "./billing.service.js";

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService],
})
export class BillingModule {}
