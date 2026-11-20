import { apiKey } from "@better-auth/api-key";
import { genericOAuth } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins/magic-link";

import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { sendEmail } from "@kan/email";
import { createLogger } from "@kan/logger";

import { socialProvidersPlugin } from "./providers";

const log = createLogger("auth");

export function getApiKeyFromHeaders(
  headers: Headers | null | undefined,
): string | null {
  const authorization = headers?.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer (.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1] ?? null;
  }
  return headers?.get("x-api-key") ?? null;
}

export function createPlugins(db: dbClient) {
  return [
    socialProvidersPlugin(),
    apiKey({
      schema: { apikey: { fields: { referenceId: "userId" } } },
      enableSessionForAPIKeys: true,
      customAPIKeyGetter: (ctx) =>
        getApiKeyFromHeaders(ctx.headers as Headers | undefined),
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60,
        maxRequests: 600,
      },
    }),
    magicLink({
      expiresIn: 60 * 60 * 24 * 7,
      sendMagicLink: async ({ email, url }) => {
        try {
          const decodedUrl = decodeURIComponent(url);
          log.info(
            { email, isInvite: decodedUrl.includes("type=invite") },
            "Sending magic link",
          );
          if (decodedUrl.includes("type=invite")) {
            let inviterName = "";
            let workspaceName = "";

            try {
              const urlObj = new URL(url);
              const callbackUrl = urlObj.searchParams.get("callbackURL");
              if (callbackUrl) {
                const callbackParams = new URL(
                  callbackUrl,
                  process.env.NEXT_PUBLIC_BASE_URL,
                ).searchParams;
                const memberPublicId = callbackParams.get("memberPublicId");

                if (memberPublicId) {
                  const member = await memberRepo.getByPublicId(
                    db,
                    memberPublicId,
                  );
                  if (member) {
                    const [workspace, inviter] = await Promise.all([
                      workspaceRepo.getById(db, member.workspaceId),
                      userRepo.getById(db, member.createdBy),
                    ]);

                    if (workspace) workspaceName = workspace.name;
                    if (inviter) inviterName = inviter.name ?? "";
                  }
                }
              }
            } catch (error) {
              log.error({ err: error }, "Failed to fetch invite details");
            }

            await sendEmail(
              email,
              workspaceName
                ? `Invitation to join the workspace ${workspaceName}`
                : "Invitation to join workspace",
              "JOIN_WORKSPACE",
              {
                magicLoginUrl: url,
                inviterName,
                workspaceName,
              },
            );
          } else {
            await sendEmail(
              email,
              process.env.NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY === "true"
                ? "Sign in to your account"
                : "Sign in to Kan",
              "MAGIC_LINK",
              {
                magicLoginUrl: url,
              },
            );
          }
        } catch (error) {
          log.error({ err: error, email }, "Error sending magic link");
        }
      },
    }),
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
                mapProfileToUser: (raw) => {
                  const profile = raw as {
                    name?: string;
                    display_name?: string;
                    preferred_username?: string;
                    given_name?: string;
                    family_name?: string;
                    email?: string;
                    email_verified?: boolean;
                    sub?: string;
                    picture?: string;
                    avatar?: string;
                  };
                  log.debug({ profile }, "OIDC profile received");

                  const name =
                    profile.name ??
                    profile.display_name ??
                    profile.preferred_username ??
                    (profile.given_name && profile.family_name
                      ? `${profile.given_name} ${profile.family_name}`.trim()
                      : (profile.given_name ?? profile.family_name)) ??
                    profile.sub ??
                    "";

                  return {
                    email: profile.email,
                    name: name,
                    emailVerified: profile.email_verified ?? false,
                    image: profile.picture ?? profile.avatar,
                  };
                },
              },
            ],
          }),
        ]
      : []),
  ];
}
