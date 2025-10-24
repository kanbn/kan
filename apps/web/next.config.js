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
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
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
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
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
