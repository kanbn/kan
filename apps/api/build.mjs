import { readFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import { transform } from "@swc/core";
import { build } from "esbuild";

// esbuild can't emit decorator metadata, which Nest's DI needs, so swc
// compiles each TS file and esbuild only bundles.
const swc = {
  name: "swc",
  setup(b) {
    b.onLoad({ filter: /\.tsx?$/ }, async ({ path }) => {
      const { code } = await transform(await readFile(path, "utf8"), {
        filename: path,
        sourceMaps: "inline",
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
            tsx: path.endsWith("x"),
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            react: { runtime: "automatic" },
          },
          target: "es2022",
        },
      });
      return { contents: code, loader: "js" };
    });
  },
};

// Packages like nestjs-zod load optional peers through their own
// createRequire(import.meta.url), which esbuild can't follow. Turn those calls
// back into require() so the peer gets bundled.
const localRequire = {
  name: "local-require",
  setup(b) {
    b.onLoad({ filter: /node_modules.*\.mjs$/ }, async ({ path }) => {
      const code = await readFile(path, "utf8");
      if (!code.includes("createRequire(import.meta.url)")) return;
      return {
        contents: code.replace(/\b__require\(/g, "require("),
        loader: "js",
      };
    });
  },
};

// Optional Nest/driver integrations that are lazily required and not installed.
const external = [
  "@nestjs/websockets",
  "class-transformer",
  "class-validator",
  "@fastify/*",
  "pg-native",
  "swagger-ui-dist",
  "@grpc/*",
  "@nats-io/*",
  "amqp-connection-manager",
  "amqplib",
  "kafkajs",
  "mqtt",
];

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
  plugins: [swc, localRequire],
  alias: { "~": "./src" },
  external,
  banner: {
    js: "import { createRequire as __kanCreateRequire } from 'node:module'; const require = __kanCreateRequire(import.meta.url);",
  },
  logLevel: "warning",
});

// The image ships no node_modules, so any package still required at runtime
// would crash. Only optional ones (in try/catch or unused paths) may remain.
const allowed = [
  ...external.map((e) => e.replace("/*", "/")),
  "ws", // pglite's socket fallback, local dev only
  "@aws-sdk/signature-v4-crt",
  "ajv", // strings inside ajv's generated code
  "ajv-formats",
];
const leftover = [
  ...(await readFile("dist/main.mjs", "utf8")).matchAll(
    /\b\w*require\d*\("([^".][^"]*)"\)/g,
  ),
]
  .map((m) => m[1].replace(/^node:/, ""))
  .filter(
    (id) =>
      !builtinModules.includes(id.split("/")[0]) &&
      !builtinModules.includes(id) &&
      !allowed.some(
        (a) => id === a || id.startsWith(a.endsWith("/") ? a : `${a}/`),
      ),
  );
if (leftover.length) {
  throw new Error(
    `Unbundled runtime requires: ${[...new Set(leftover)].join(", ")}`,
  );
}
