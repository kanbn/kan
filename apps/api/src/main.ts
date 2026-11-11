import "reflect-metadata";

import type { Response } from "express";
import { NestFactory } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";

import { createLogger } from "@kan/logger";

import { AppModule } from "./app.module.js";
import { NestPinoLogger } from "./common/logging/nest-pino.logger.js";
import { buildOpenApiDocument } from "./openapi.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new NestPinoLogger(),
  });
  app.enableShutdownHooks(["SIGINT"]);

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());

  // Served from memory, not disk — openapi.json on disk is produced by the
  // dedicated `pnpm openapi` script (see openapi.generate.ts), not on boot.
  const document = buildOpenApiDocument(app);
  app
    .getHttpAdapter()
    .get("/openapi.json", (_req, res: Response) => res.json(document));

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  createLogger("api").info({ port }, "API server running");
}

void bootstrap();
