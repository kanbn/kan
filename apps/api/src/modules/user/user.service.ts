import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";

import * as userRepo from "@kan/db/repository/user.repo";
import { generateAvatarUrl } from "@kan/shared/utils";

import { assertFound } from "../../common/assert-found.util.js";
import { db, setUserPassword } from "../../common/session.util.js";

@Injectable()
export class UserService {
  async getUser(input: { userId: string }) {
    const user = await assertFound(
      userRepo.getById(db, input.userId),
      `User not found`,
    );
    const apiKey = user.apiKeys[0];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: await generateAvatarUrl(user.image),
      stripeCustomerId: user.stripeCustomerId,
      hasPassword: user.hasPassword,
      hasMagicLinkAccount: user.hasMagicLinkAccount,
      apiKey: apiKey ? { id: apiKey.id, prefix: apiKey.prefix } : null,
    };
  }

  async update(input: { userId: string; name?: string; image?: string }) {
    const result = await assertFound(
      userRepo.update(db, input.userId, {
        name: input.name,
        image: input.image,
      }),
      `User not found`,
    );

    return {
      name: result.name,
      image: await generateAvatarUrl(result.image),
    };
  }

  async setPassword(input: {
    userId: string;
    newPassword: string;
    headers: Headers;
  }) {
    const user = await assertFound(
      userRepo.getById(db, input.userId),
      `User not found`,
    );

    if (user.hasPassword)
      throw new TRPCError({
        message: `Password already set; use change password instead`,
        code: "BAD_REQUEST",
      });

    try {
      await setUserPassword(input.headers, input.newPassword);
    } catch {
      throw new TRPCError({
        message: "Failed to set password",
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    return { success: true };
  }
}
