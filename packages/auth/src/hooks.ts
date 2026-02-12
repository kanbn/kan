import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ChatOrPushProviderEnum } from "@novu/api/models/components";
import { createAuthMiddleware } from "better-auth/api";
import { env } from "next-runtime-env";

import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import { notificationClient } from "@kan/email";
import { createEmailUnsubscribeLink, createS3Client } from "@kan/shared";

import { downloadImage } from "./utils";

type BetterAuthUser = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null | undefined;
  stripeCustomerId?: string | null | undefined;
} & Record<string, unknown>;

export function createDatabaseHooks(db: dbClient) {
  return {
    user: {
      create: {
        async before(user: BetterAuthUser, _context: unknown) {
          if (env("NEXT_PUBLIC_DISABLE_SIGN_UP")?.toLowerCase() === "true") {
            const pendingInvitation = await memberRepo.getByEmailAndStatus(
              db,
              user.email,
              "invited",
            );

            if (!pendingInvitation) {
              return Promise.resolve(false);
            }

            // Fall through to any additional checks below
          }
          // Enforce allowed domains (OIDC/social) if configured
          const allowed = process.env.BETTER_AUTH_ALLOWED_DOMAINS?.split(",")
            .map((d) => d.trim().toLowerCase())
            .filter(Boolean);
          if (allowed && allowed.length > 0) {
            const domain = user.email.split("@")[1]?.toLowerCase();
            if (!domain || !allowed.includes(domain)) {
              return Promise.resolve(false);
            }
          }
          return Promise.resolve(true);
        },
        async after(user: BetterAuthUser, _context: unknown) {
          let avatarKey = user.image;
          const storageDomain = process.env.NEXT_PUBLIC_STORAGE_DOMAIN;
          if (
            user.image &&
            storageDomain &&
            !user.image.includes(storageDomain)
          ) {
            try {
              const client = createS3Client();

              const allowedFileExtensions = ["jpg", "jpeg", "png", "webp"];

              const fileExtension =
                user.image.split(".").pop()?.split("?")[0] ?? "jpg";
              const key = `${user.id}/avatar.${!allowedFileExtensions.includes(fileExtension) ? "jpg" : fileExtension}`;

              const imageBuffer = await downloadImage(user.image);

              await client.send(
                new PutObjectCommand({
                  Bucket: env("NEXT_PUBLIC_AVATAR_BUCKET_NAME") ?? "",
                  Key: key,
                  Body: imageBuffer,
                  ContentType: `image/${!allowedFileExtensions.includes(fileExtension) ? "jpeg" : fileExtension}`,
                  ACL: "public-read",
                }),
              );

              avatarKey = key;

              await userRepo.update(db, user.id, {
                image: key,
              });
            } catch (error) {
              console.error(error);
            }
          }

          if (notificationClient) {
            try {
              const [firstName, ...rest] = (user.name || "")
                .split(" ")
                .filter(Boolean);
              const lastName = rest.length ? rest.join(" ") : undefined;
              const avatarUrl = avatarKey
                ? `${env("NEXT_PUBLIC_STORAGE_URL")}/${env("NEXT_PUBLIC_AVATAR_BUCKET_NAME")}/${avatarKey}`
                : undefined;

              const unsubscribeUrl = await createEmailUnsubscribeLink(user.id);

              await notificationClient.trigger({
                to: {
                  subscriberId: user.id,
                  firstName: firstName,
                  lastName: lastName,
                  email: user.email,
                  avatar: avatarUrl,
                  data: {
                    emailVerified: user.emailVerified,
                    stripeCustomerId: user.stripeCustomerId,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                  },
                },
                payload: {
                  emailUnsubscribeUrl: unsubscribeUrl,
                },
                workflowId: "user-signup",
              });

              await notificationClient.subscribers.credentials.update(
                {
                  providerId: ChatOrPushProviderEnum.Discord,
                  credentials: {
                    webhookUrl: env("DISCORD_WEBHOOK_URL"),
                  },
                  integrationIdentifier: "discord",
                },
                user.id,
              );
            } catch (error) {
              console.error("Error adding user to notification client", error);
            }
          }
        },
      },
    },
  };
}

export function createMiddlewareHooks(db: dbClient) {
  return {
    after: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path === "/magic-link/verify" &&
        (ctx.query?.callbackURL as string | undefined)?.includes("type=invite")
      ) {
        const userId = ctx.context.newSession?.session.userId;
        const callbackURL = ctx.query?.callbackURL as string | undefined;
        const memberPublicId = callbackURL?.split("memberPublicId=")[1];

        if (userId && memberPublicId) {
          const member = await memberRepo.getByPublicId(db, memberPublicId);

          if (member?.id) {
            await memberRepo.acceptInvite(db, {
              memberId: member.id,
              userId,
            });
          }
        }
      }
    }),
  };
}
