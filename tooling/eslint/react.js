import hooksPlugin from "eslint-plugin-react-hooks";

/** @type {Awaited<import('typescript-eslint').Config>} */
export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "react-hooks": hooksPlugin,
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      // React Compiler rules; we don't use the compiler yet
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
    languageOptions: {
      globals: {
        React: "writable",
      },
    },
  },
];
