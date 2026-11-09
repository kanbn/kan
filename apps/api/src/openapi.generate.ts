import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { writeOpenApiDocuments } from "./openapi.js";

const app = await NestFactory.create(AppModule, {
  preview: true,
  logger: false,
});
writeOpenApiDocuments(app);
console.log("📄 OpenAPI spec written to openapi.json");
process.exit(0);
