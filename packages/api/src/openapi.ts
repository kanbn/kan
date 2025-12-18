import { env } from "next-runtime-env";
import { generateOpenApiDocument } from "trpc-to-openapi";

import { appRouter } from "./root";

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "Kan API",
  description: "OpenAPI compliant REST API",
  version: "1.0.0",
  baseUrl: `${env("NEXT_PUBLIC_BASE_URL")}/api/v1`,
  docsUrl: "docs.kan.bn",
  tags: [
    "Auth",
    "Users",
    "Boards",
    "Lists",
    "Cards",
    "Labels",
    "Imports",
    "Integrations",
    "Health",
  ],
});
