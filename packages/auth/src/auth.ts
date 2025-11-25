import type { Subscription } from "@better-auth/stripe";
import type Stripe from "stripe";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { stripe } from "@better-auth/stripe";
import { ChatOrPushProviderEnum } from "@novu/api/models/components";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { apiKey, genericOAuth } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins/magic-link";
import { socialProviderList } from "better-auth/social-providers";
import { env } from "next-runtime-env";

import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as schema from "@kan/db/schema";
import { notificationClient, sendEmail } from "@kan/email";
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
      async (ctx) => {
        const providers = ctx.context.socialProviders.map((p) =>
          p.id.toLowerCase(),
        );
        // Add OIDC provider if configured
        if (
          process.env.OIDC_CLIENT_ID &&
          process.env.OIDC_CLIENT_SECRET &&
          process.env.OIDC_DISCOVERY_URL
        ) {
          providers.push("oidc");
        }
        return ctx.json(providers);
      },
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
    baseURL: env("NEXT_PUBLIC_BASE_URL"),
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? [
          env("NEXT_PUBLIC_BASE_URL") ?? "",
          ...process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(","),
        ]
      : [env("NEXT_PUBLIC_BASE_URL") ?? ""],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
      },
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 2, // Update session expiry every 48 hours if user is active
      freshAge: 0,
    },
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
      deleteUser: {
        enabled: true,
      },
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
      ...(process.env.NEXT_PUBLIC_KAN_ENV === "cloud"
        ? [
            stripe({
              stripeClient: createStripeClient(),
              stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
              createCustomerOnSignUp: true,
              subscription: {
                enabled: true,
                plans: [
                  {
                    name: "team",
                    priceId: process.env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID!,
                    annualDiscountPriceId:
                      process.env.STRIPE_TEAM_PLAN_YEARLY_PRICE_ID!,
                    freeTrial: {
                      days: 14,
                      onTrialStart: async (subscription) => {
                        await triggerWorkflow(db, "trial-start", subscription);
                      },
                      onTrialEnd: async ({ subscription }) => {
                        await triggerWorkflow(db, "trial-end", subscription);
                      },
                      onTrialExpired: async (subscription) => {
                        await triggerWorkflow(
                          db,
                          "trial-expired",
                          subscription,
                        );
                      },
                    },
                  },
                  {
                    name: "pro",
                    priceId: process.env.STRIPE_PRO_PLAN_MONTHLY_PRICE_ID!,
                    annualDiscountPriceId:
                      process.env.STRIPE_PRO_PLAN_YEARLY_PRICE_ID!,
                    freeTrial: {
                      days: 14,
                      onTrialStart: async (subscription) => {
                        await triggerWorkflow(db, "trial-start", subscription);
                      },
                      onTrialEnd: async ({ subscription }) => {
                        await triggerWorkflow(db, "trial-end", subscription);
                      },
                      onTrialExpired: async (subscription) => {
                        await triggerWorkflow(
                          db,
                          "trial-expired",
                          subscription,
                        );
                      },
                    },
                  },
                ],
                authorizeReference: async (data) => {
                  const workspace = await workspaceRepo.getByPublicId(
                    db,
                    data.referenceId,
                  );

                  if (!workspace) {
                    return Promise.resolve(false);
                  }

                  const isUserInWorkspace =
                    await workspaceRepo.isUserInWorkspace(
                      db,
                      data.user.id,
                      workspace.id,
                    );

                  return isUserInWorkspace;
                },
                getCheckoutSessionParams: () => {
                  return {
                    params: {
                      allow_promotion_codes: true,
                    },
                  };
                },
                onSubscriptionComplete: async ({
                  subscription,
                  stripeSubscription,
                }) => {
                  // Set unlimited seats to true for pro plans
                  if (subscription.plan === "pro") {
                    await subscriptionRepo.updateByStripeSubscriptionId(
                      db,
                      stripeSubscription.id,
                      {
                        unlimitedSeats: true,
                      },
                    );
                    console.log(
                      `Pro subscription ${stripeSubscription.id} activated with unlimited seats`,
                    );

                    const workspace = await workspaceRepo.getByPublicId(
                      db,
                      subscription.referenceId,
                    );

                    if (workspace?.id) {
                      await memberRepo.unpauseAllMembers(db, workspace.id);

                      console.log(
                        `Unpausing all members for workspace ${workspace.id}`,
                      );
                    }
                  }
                },
              },
            }),
          ]
        : []),
      // @todo: hasing is disabled due to a bug in the api key plugin
      apiKey({
        disableKeyHashing: true,
        rateLimit: {
          enabled: true,
          timeWindow: 1000 * 60, // 1 minute
          maxRequests: 100, // 100 requests per minute
        },
      }),
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
      // Generic OIDC provider
      ...(process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_DISCOVERY_URL
        ? [
            genericOAuth({
              config: [
                {
                  providerId: "oidc",
                  clientId: process.env.OIDC_CLIENT_ID,
                  clientSecret: process.env.OIDC_CLIENT_SECRET,
                  discoveryUrl: process.env.OIDC_DISCOVERY_URL,
                  scopes: ["openid", "email", "profile"],
                  pkce: true,
                },
              ],
            }),
          ]
        : []),
    ],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (env("NEXT_PUBLIC_DISABLE_SIGN_UP")?.toLowerCase() === "true") {
              const pendingInvitation = await memberRepo.getByEmailAndStatus(
                db,
                user.email,
                "invited",
              );

              if (!pendingInvitation) {
                return Promise.resolve(false);
              }

              return Promise.resolve(true);
            }
            return Promise.resolve(true);
          },
          async after(user) {
            let avatarKey = user.image;
            if (
              user.image &&
              !user.image.includes(process.env.NEXT_PUBLIC_STORAGE_DOMAIN!)
            ) {
              try {
                const client = new S3Client({
                  region: env("S3_REGION") ?? "",
                  endpoint: env("S3_ENDPOINT") ?? "",
                  forcePathStyle: env("S3_FORCE_PATH_STYLE") === "true",
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
                const [firstName, ...rest] = user.name
                  .split(" ")
                  .filter(Boolean);
                const lastName = rest.length ? rest.join(" ") : undefined;
                const avatarUrl = avatarKey
                  ? `${env("NEXT_PUBLIC_STORAGE_URL")}/${env("NEXT_PUBLIC_AVATAR_BUCKET_NAME")}/${avatarKey}`
                  : undefined;

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
                  workflowId: "user-signup",
                });

                await notificationClient.subscribers.credentials.update(
                  {
                    providerId: ChatOrPushProviderEnum.Discord,
                    credentials: {
                      webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
                    },
                    integrationIdentifier: "discord",
                  },
                  user.id,
                );
              } catch (error) {
                console.error(
                  "Error adding user to notification client",
                  error,
                );
              }
            }
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path === "/magic-link/verify" &&
          (ctx.query?.callbackURL as string | undefined)?.includes(
            "type=invite",
          )
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
    },
    advanced: {
      cookiePrefix: "kan",
      database: {
        generateId: false,
      },
    },
  });
};

async function triggerWorkflow(
  db: dbClient,
  workflowId: string,
  subscription: Subscription,
  cancellationDetails?: Stripe.Subscription.CancellationDetails | null,
) {
  try {
    if (!subscription.stripeCustomerId || !notificationClient) return;

    const user = await userRepo.getByStripeCustomerId(
      db,
      subscription.stripeCustomerId,
    );

    if (!user || !notificationClient) return;

    await notificationClient.trigger({
      to: {
        subscriberId: user.id,
      },
      payload: {
        ...subscription,
        cancellationDetails,
      },
      workflowId,
    });
  } catch (error) {
    console.error("Error triggering workflow", error);
  }
}
