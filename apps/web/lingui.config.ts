import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
  locales: ["en", "fr", "de", "es", "it", "nl", "ru", "pl"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src"],
      exclude: ["**/node_modules/**"],
    },
  ],
};

export default config;
