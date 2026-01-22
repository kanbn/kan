import { fileURLToPath } from "url";
import createJiti from "jiti";
import { env } from "next-runtime-env";
import { configureRuntimeEnv } from "next-runtime-env/build/configure.js";

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
createJiti(fileURLToPath(import.meta.url))("./src/env");

configureRuntimeEnv();

/** @type {import("next").NextConfig} */
const config = {
  output:
    env("NEXT_PUBLIC_USE_STANDALONE_OUTPUT") === "true"
      ? "standalone"
      : undefined,
  reactStrictMode: true,

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@kan/api",
    "@kan/db",
    "@kan/shared",
    "@kan/auth",
    "@kan/stripe",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  // temporarily ignore eslint errors during build until we fix all the errors sigh
  eslint: { ignoreDuringBuilds: true },

  images: {
    remotePatterns: (() => {
      /** @type {Array<{protocol: "http" | "https", hostname: string}>} */
      const patterns = [
        {
          protocol: "https",
          hostname:
            env("S3_FORCE_PATH_STYLE") === "true"
              ? `${env("NEXT_PUBLIC_STORAGE_DOMAIN")}`
              : `*.${env("NEXT_PUBLIC_STORAGE_DOMAIN")}`,
        },
        {
          protocol: "http",
          hostname: "localhost",
        },
        {
          protocol: "https",
          hostname: "*.googleusercontent.com",
        },
        {
          protocol: 'https',
          hostname: 'cdn.discordapp.com',
          pathname: '/avatars/**',
        },
      ];

      // Extract root domain from S3_ENDPOINT and add wildcard pattern
      const s3Endpoint = env("S3_ENDPOINT");
      if (s3Endpoint) {
        try {
          const url = new URL(s3Endpoint);
          const hostname = url.hostname;
          const protocol = url.protocol.replace(":", "");

          // Extract root domain (last 2 parts: e.g. cloudflarestorage.com)
          const parts = hostname.split(".");
          if (parts.length >= 2) {
            const rootDomain = parts.slice(-2).join(".");
            patterns.push({
              protocol: protocol === "http" ? "http" : "https",
              hostname: `*.${rootDomain}`,
            });
          }
        } catch {
          // If S3_ENDPOINT is not a valid URL, ignore it
        }
      }

      return patterns;
    })(),
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  experimental: {
    // instrumentationHook: true,
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },

  async rewrites() {
    return [
      {
        source: "/settings",
        destination: "/settings/account",
      },
    ];
  },
};

// Only allow external images when OIDC is configured (for OIDC provider avatars)
if (
  env("OIDC_CLIENT_ID") &&
  env("OIDC_CLIENT_SECRET") &&
  env("OIDC_DISCOVERY_URL")
) {
  config.images?.remotePatterns?.push({
    protocol: "https",
    hostname: "**",
  });
}

export default config;
