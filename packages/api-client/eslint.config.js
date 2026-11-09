import baseConfig from "@kan/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", "node_modules/**", ".turbo/**", "src/generated.ts"],
  },
];
