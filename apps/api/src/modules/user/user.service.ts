import type { Readable } from "node:stream";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  PayloadTooLargeException,
} from "@nestjs/common";

import * as userRepo from "@kan/db/repository/user.repo";
import { generateAvatarUrl, uploadObject } from "@kan/shared/utils";

import { assertFound } from "../../common/assert-found.util.js";
import { db, setUserPassword } from "../../common/session.util.js";

const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      throw new BadRequestException(
        `Password already set; use change password instead`,
      );

    try {
      await setUserPassword(input.headers, input.newPassword);
    } catch {
      throw new InternalServerErrorException("Failed to set password");
    }

    return { success: true };
  }

  async uploadAvatar(input: {
    userId: string;
    body: Readable;
    filename: string;
    contentType: string;
    maxBytes: number;
  }) {
    if (!AVATAR_CONTENT_TYPES.includes(input.contentType))
      throw new BadRequestException("Invalid content type");

    const bucket = process.env.NEXT_PUBLIC_AVATAR_BUCKET_NAME;
    if (!bucket)
      throw new InternalServerErrorException("Avatar bucket not configured");

    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of input.body as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > input.maxBytes)
        throw new PayloadTooLargeException("File too large");
      chunks.push(chunk);
    }

    const filename = input.filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .substring(0, 200);
    const key = `${input.userId}/${filename}`;

    await uploadObject(
      bucket,
      key,
      Buffer.concat(chunks),
      input.contentType,
      size,
    );
    await userRepo.update(db, input.userId, { image: key });

    return { success: true };
  }
}
