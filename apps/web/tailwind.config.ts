import type { Config } from "tailwindcss";

import baseConfig from "@kan/tailwind-config/web";

export default {
  darkMode: "class",
  content: [...baseConfig.content],
  plugins: [require("@tailwindcss/typography")],
  presets: [baseConfig],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
      },
    },
  },
} satisfies Config;
