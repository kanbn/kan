import "reflect-metadata";

import type { Response } from "express";
import { NestFactory } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";

import { AppModule } from "./app.module.js";
import { writeOpenApiDocuments } from "./openapi.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(["SIGINT"]);

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());

  const document = writeOpenApiDocuments(app);
  console.log("📄 OpenAPI spec written to openapi.json");
  app
    .getHttpAdapter()
    .get("/openapi.json", (_req, res: Response) => res.json(document));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}`);
}

void bootstrap();
