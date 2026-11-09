import { writeFileSync } from "fs";
import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("Kan API")
    .setDescription("OpenAPI compliant REST API")
    .setVersion("1.0.0")
    .addBearerAuth({ type: "http", scheme: "bearer" }, "bearer")
    .build();

  // Required by nestjs-zod: hoists nested schemas out of inline $defs into
  // components.schemas entries with resolvable $refs, which orval needs.
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

export function writeOpenApiDocuments(app: INestApplication): OpenAPIObject {
  const document = buildOpenApiDocument(app);
  writeFileSync("./openapi.json", JSON.stringify(document, null, 2));
  return document;
}
