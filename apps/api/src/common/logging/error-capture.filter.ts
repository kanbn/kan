import type { ArgumentsHost } from "@nestjs/common";
import type { Response } from "express";
import { Catch } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";

// Hands the exception to the request log (guards and pipes throw before any
// interceptor runs), then responds exactly as Nest would by default.
@Catch()
export class ErrorCaptureFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === "http")
      host.switchToHttp().getResponse<Response>().locals.error = exception;
    super.catch(exception, host);
  }
}
