import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { apiKey } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins/magic-link";
import { socialProviderList } from "better-auth/social-providers";
import { env } from "next-runtime-env";

import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as schema from "@kan/db/schema";
import { sendEmail } from "@kan/email";
import { createStripeClient } from "@kan/stripe";

export const configuredProviders = socialProviderList.reduce<
  Record<
    string,
    {
      clientId: string;
      clientSecret: string;
      appBundleIdentifier?: string;
      tenantId?: string;
      requireSelectAccount?: boolean;
      clientKey?: string;
      issuer?: string;
    }
  >
>((acc, provider) => {
  const id = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const secret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
  if (id && id.length > 0 && secret && secret.length > 0) {
    acc[provider] = { clientId: id, clientSecret: secret };
  }
  if (
    provider === "apple" &&
    Object.keys(acc).includes("apple") &&
    acc[provider]
  ) {
    const bundleId =
      process.env[`${provider.toUpperCase()}_APP_BUNDLE_IDENTIFIER`];
    if (bundleId && bundleId.length > 0) {
      acc[provider].appBundleIdentifier = bundleId;
    }
  }
  if (
    provider === "gitlab" &&
    Object.keys(acc).includes("gitlab") &&
    acc[provider]
  ) {
    const issuer = process.env[`${provider.toUpperCase()}_ISSUER`];
    if (issuer && issuer.length > 0) {
      acc[provider].issuer = issuer;
    }
  }
  if (
    provider === "microsoft" &&
    Object.keys(acc).includes("microsoft") &&
    acc[provider]
  ) {
    acc[provider].tenantId = "common";
    acc[provider].requireSelectAccount = true;
  }
  if (
    provider === "tiktok" &&
    Object.keys(acc).includes("tiktok") &&
    acc[provider]
  ) {
    const key = process.env[`${provider.toUpperCase()}_CLIENT_KEY`];
    if (key && key.length > 0) {
      acc[provider].clientKey = key;
    }
  }
  return acc;
}, {});

export const socialProvidersPlugin = () => ({
  id: "social-providers-plugin",
  endpoints: {
    getSocialProviders: createAuthEndpoint(
      "/social-providers",
      {
        method: "GET",
      },
      async (ctx) =>
        ctx.json(ctx.context.socialProviders.map((p) => p.name.toLowerCase())),
    ),
  },
});

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export const initAuth = (db: dbClient) => {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_BASE_URL!,
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
      : [],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
      },
    }),
    emailAndPassword: {
      enabled: env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true",
      disableSignUp:
        env("NEXT_PUBLIC_DISABLE_SIGN_UP")?.toLowerCase() === "true",
      sendResetPassword: async (data) => {
        await sendEmail(data.user.email, "Reset Password", "RESET_PASSWORD", {
          resetPasswordUrl: data.url,
          resetPasswordToken: data.token,
        });
      },
    },
    socialProviders: configuredProviders,
    user: {
      additionalFields: {
        stripeCustomerId: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
      },
    },
    plugins: [
      socialProvidersPlugin(),
      // @todo: hasing is disabled due to a bug in the api key plugin
      apiKey({ disableKeyHashing: true }),
      magicLink({
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        sendMagicLink: async ({ email, url }) => {
          if (url.includes("type=invite")) {
            await sendEmail(
              email,
              "Invitation to join workspace",
              "JOIN_WORKSPACE",
              {
                magicLoginUrl: url,
              },
            );
          } else {
            await sendEmail(email, "Sign in to kan.bn", "MAGIC_LINK", {
              magicLoginUrl: url,
            });
          }
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          async after(user, _context) {
            if (
              user.image &&
              !user.image.includes(process.env.NEXT_PUBLIC_STORAGE_DOMAIN!)
            ) {
              try {
                const client = new S3Client({
                  region: env("S3_REGION") ?? "",
                  endpoint: env("S3_ENDPOINT") ?? "",
                  credentials: {
                    accessKeyId: env("S3_ACCESS_KEY_ID") ?? "",
                    secretAccessKey: env("S3_SECRET_ACCESS_KEY") ?? "",
                  },
                });

                const allowedFileExtensions = ["jpg", "jpeg", "png", "webp"];

                const fileExtension =
                  user.image.split(".").pop()?.split("?")[0] || "jpg";
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
                await userRepo.update(db, user.id, {
                  image: key,
                });
              } catch (error) {
                console.error(error);
              }
            }
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path.startsWith("/get-session")) {
          const user = ctx.context.session?.user;

          if (
            env("NEXT_PUBLIC_KAN_ENV") === "cloud" &&
            user &&
            !user.stripeCustomerId
          ) {
            const stripe = createStripeClient();
            const stripeCustomer = await stripe.customers.create({
              email: user.email,
              metadata: {
                userId: user.id,
              },
            });

            await userRepo.update(db, user.id, {
              stripeCustomerId: stripeCustomer.id,
            });
          }
        } else if (
          ctx.path === "/magic-link/verify" &&
          (ctx.query?.callbackURL as string | undefined)?.includes(
            "type=invite",
          ) &&
          ctx.query?.memberPublicId
        ) {
          const userId = ctx.context.newSession?.session.userId;
          const memberPublicId = ctx.query.memberPublicId as string;

          if (userId) {
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
    },
    advanced: {
      cookiePrefix: "kan",
      database: {
        generateId: false,
      },
    },
  });
};
