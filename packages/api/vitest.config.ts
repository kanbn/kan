import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "integration-tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@kan/db": resolve(__dirname, "../db/src"),
    },
  },
});
