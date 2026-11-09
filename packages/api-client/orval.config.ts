import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../../apps/api/openapi.json",
      parserOptions: {
        validate: false,
      },
    },
    output: {
      target: "./src/generated.ts",
      client: "react-query",
      httpClient: "fetch",
      override: {
        mutator: {
          path: "./src/mutator/custom-fetch.ts",
          name: "customFetch",
        },
        requestOptions: {
          credentials: "include",
        },
      },
    },
  },
});
