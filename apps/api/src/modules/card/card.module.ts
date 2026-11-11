import { Module } from "@nestjs/common";

import { CardController, CardReadController } from "./card.controller.js";
import { CardService } from "./card.service.js";

@Module({
  controllers: [CardController, CardReadController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
