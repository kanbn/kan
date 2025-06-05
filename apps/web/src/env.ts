import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets";
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
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string(),
    POSTGRES_URL: z.string().url(),
    STRIPE_SECRET_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    EMAIL_FROM: z.string(),
    EMAIL_URL: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_KAN_ENV: z.string().optional(),
    NEXT_PUBLIC_UMAMI_ID: z.string().optional(),
    NEXT_PUBLIC_BASE_URL: z.string(),
    NEXT_PUBLIC_STORAGE_URL: z.string().optional(),
    NEXT_PUBLIC_AVATAR_BUCKET_NAME: z.string().optional(),
    NEXT_PUBLIC_STORAGE_DOMAIN: z.string().optional(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NEXT_PUBLIC_KAN_ENV: process.env.NEXT_PUBLIC_KAN_ENV,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_UMAMI_ID: process.env.NEXT_PUBLIC_UMAMI_ID,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_AVATAR_BUCKET_NAME: process.env.NEXT_PUBLIC_AVATAR_BUCKET_NAME,
    NEXT_PUBLIC_STORAGE_DOMAIN: process.env.NEXT_PUBLIC_STORAGE_DOMAIN,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
