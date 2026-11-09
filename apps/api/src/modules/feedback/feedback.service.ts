import { Injectable, InternalServerErrorException } from "@nestjs/common";

import * as feedbackRepo from "@kan/db/repository/feedback.repo";

import { db } from "../../common/session.util.js";

@Injectable()
export class FeedbackService {
  async create(input: { feedback: string; url: string; userId: string }) {
    const result = await feedbackRepo.create(db, {
      feedback: input.feedback,
      url: input.url,
      createdBy: input.userId,
    });

    if (!result?.id) {
      throw new InternalServerErrorException("Unable to create feedback");
    }

    return { success: true };
  }
}
