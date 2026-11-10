import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { Catch, HttpStatus } from "@nestjs/common";
import { TRPCError } from "@trpc/server";

// @kan/api/utils/permissions throws TRPCError, not Nest HttpExceptions — map it once here.
const STATUS_BY_CODE: Partial<Record<TRPCError["code"], HttpStatus>> = {
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
};

@Catch(TRPCError)
export class TrpcErrorFilter implements ExceptionFilter {
  catch(exception: TRPCError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      STATUS_BY_CODE[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
