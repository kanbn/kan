import { writeFileSync } from "node:fs";
import { createJiti } from "jiti";

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await createJiti(import.meta.url).import("./src/env");

// bootstrap.cjs rewrites this at container start in the Docker image
const publicEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.startsWith("NEXT_PUBLIC_")),
);
writeFileSync("public/__ENV.js", `self.__ENV = ${JSON.stringify(publicEnv)};`);

/** @type {import("next").NextConfig} */
const config = {
  output:
    process.env.NEXT_PUBLIC_USE_STANDALONE_OUTPUT === "true"
      ? "standalone"
      : undefined,
  reactStrictMode: true,

  /** Exclude build tools and dev-only packages from the standalone output */
  outputFileTracingExcludes: {
    "**/*": [
      "@esbuild/**",
      "esbuild/**",
      "typescript/**",
      "webpack/**",
      "uglify-js/**",
      "terser/**",
    ],
  },

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@kan/server",
    "@kan/api-client",
    "@kan/db",
    "@kan/shared",
    "@kan/auth",
    "@kan/stripe",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: (() => {
      /** @type {Array<{protocol: "http" | "https", hostname: string}>} */
      const patterns = [
        { protocol: "https", hostname: "**" },
        {
          protocol: "http",
          hostname: "localhost",
        },
      ];

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
  serverExternalPackages: ["pino"],

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
  process.env.OIDC_CLIENT_ID &&
  process.env.OIDC_CLIENT_SECRET &&
  process.env.OIDC_DISCOVERY_URL
) {
  config.images?.remotePatterns?.push({
    protocol: "https",
    hostname: "**",
  });
}

export default config;
