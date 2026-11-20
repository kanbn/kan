import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod";

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    KAN_ADMIN_API_KEY: z.string().optional(),
    POSTGRES_URL: z.string().url().optional().or(z.literal("")),
    RATE_LIMIT_IP_HEADER: z.string().optional(),
    TRELLO_APP_API_KEY: z.string().optional(),
    TRELLO_APP_SECRET: z.string().optional(),
    SUBSCRIBER_API_URL: z.string().url().optional(),
    SUBSCRIBER_API_KEY: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    REDIS_URL: z.string().url().optional().or(z.literal("")),
    S3_AVATAR_UPLOAD_LIMIT: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_KAN_ENV: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    NEXT_PUBLIC_USE_STANDALONE_OUTPUT: z.string().optional(),
    NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_STORAGE_URL: z.string().url().optional(),
    NEXT_PUBLIC_AVATAR_BUCKET_NAME: z.string().optional(),
    NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME: z.string().optional(),
    NEXT_PUBLIC_STORAGE_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS: z
      .string()
      .transform((s) => (s === "" ? undefined : s))
      .refine(
        (s) => !s || s.toLowerCase() === "true" || s.toLowerCase() === "false",
      )
      .optional(),
    NEXT_PUBLIC_APP_VERSION: z.string().optional(),
    NEXT_PUBLIC_ALLOW_CREDENTIALS: z
      .string()
      .transform((s) => (s === "" ? undefined : s))
      .refine(
        (s) => !s || s.toLowerCase() === "true" || s.toLowerCase() === "false",
      )
      .optional(),
    NEXT_PUBLIC_DISABLE_SIGN_UP: z
      .string()
      .transform((s) => (s === "" ? undefined : s))
      .refine(
        (s) => !s || s.toLowerCase() === "true" || s.toLowerCase() === "false",
      )
      .optional(),
    NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY: z
      .string()
      .transform((s) => (s === "" ? undefined : s))
      .refine(
        (s) => !s || s.toLowerCase() === "true" || s.toLowerCase() === "false",
      )
      .optional(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NEXT_PUBLIC_KAN_ENV: process.env.NEXT_PUBLIC_KAN_ENV,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_AVATAR_BUCKET_NAME: process.env.NEXT_PUBLIC_AVATAR_BUCKET_NAME,
    NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME:
      process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME,
    NEXT_PUBLIC_STORAGE_DOMAIN: process.env.NEXT_PUBLIC_STORAGE_DOMAIN,
    NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS:
      process.env.NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_ALLOW_CREDENTIALS: process.env.NEXT_PUBLIC_ALLOW_CREDENTIALS,
    NEXT_PUBLIC_DISABLE_SIGN_UP: process.env.NEXT_PUBLIC_DISABLE_SIGN_UP,
    NEXT_PUBLIC_USE_STANDALONE_OUTPUT:
      process.env.NEXT_PUBLIC_USE_STANDALONE_OUTPUT,
    NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY:
      process.env.NEXT_PUBLIC_WHITE_LABEL_HIDE_POWERED_BY,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
