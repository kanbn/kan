import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true },
      },
    }),
  ],
  test: {
    include: ["src/**/*.spec.ts"],
    globals: true,
    // @kan/db falls back to a single on-disk PGLite instance (./pgdata) when
    // POSTGRES_URL is unset; concurrent workers race to open/migrate it,
    // crashing the WASM runtime. One fork serializes every spec file.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
