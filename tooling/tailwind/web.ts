import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import scrollbar from "tailwind-scrollbar";

export default {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans), Plus Jakarta Sans"],
      },
      fontSize: {
        sm: "0.8rem",
      },
      boxShadow: {
        "3xl-dark": "0px 16px 70px rgba(0, 0, 0, 0.5)",
        "3xl-light":
          "rgba(0, 0, 0, 0.12) 0px 4px 30px, rgba(0, 0, 0, 0.04) 0px 3px 17px, rgba(0, 0, 0, 0.04) 0px 2px 8px, rgba(0, 0, 0, 0.04) 0px 1px 1px",
      },
      animation: {
        "border-spin": "border-spin 4s linear infinite",
        "fade-down": "fade-down 0.5s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        scroll: "scroll 40s linear infinite",
      },

      keyframes: {
        "border-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        scroll: {
          "0%": {
            transform: "translateX(0)",
          },
          "100%": {
            transform: "translateX(calc(-50% - 1.5rem))",
          },
        },
      },
      colors: {
        "dark-50": "#0f1716",
        "dark-100": "#18201f",
        "dark-200": "#1c2524",
        "dark-300": "#222c2a",
        "dark-400": "#28322f",
        "dark-500": "#2e3a36",
        "dark-600": "#394743",
        "dark-700": "#4b5b55",
        "dark-800": "#6e7e78",
        "dark-900": "#7c8c85",
        "dark-950": "#b6c2bd",
        "dark-1000": "#ecf1ef",
        "light-50": "hsl(0deg 0% 98.8%)",
        "light-100": "hsl(0deg 0% 97.3%)",
        "light-200": "hsl(0deg 0% 95.3%)",
        "light-300": "hsl(0deg 0% 92.9%)",
        "light-400": "hsl(0deg 0% 91%)",
        "light-500": "hsl(0deg 0% 88.6%)",
        "light-600": "hsl(0deg 0% 85.9%)",
        "light-700": "hsl(0deg 0% 78%)",
        "light-800": "hsl(0deg 0% 56.1%)",
        "light-900": "hsl(0deg 0% 52.2%)",
        "light-950": "hsl(0deg 0% 43.5%)",
        "light-1000": "hsl(0deg 0% 9%)",
      },
      screens: {
        "2xl": "1600px",
      },
    },
  },
  plugins: [forms, scrollbar],
} satisfies Config;
