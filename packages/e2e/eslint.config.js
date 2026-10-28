import baseConfig from "@kan/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["playwright-report/**", "test-results/**"],
  },
  ...baseConfig,
];
