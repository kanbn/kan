import type { Request } from "express";
import {
  applyDecorators,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiHeader } from "@nestjs/swagger";

/**
 * Files are sent as a raw application/octet-stream body so Nest's JSON and
 * form parsers never consume them; the real type and name travel in headers.
 */
export function readUploadHeaders(req: Request, maxBytes: number) {
  if (req.headers["content-type"] !== "application/octet-stream")
    throw new UnsupportedMediaTypeException(
      "Send the file as application/octet-stream",
    );

  const size = Number(req.headers["content-length"]);
  if (!Number.isInteger(size) || size <= 0)
    throw new BadRequestException("Missing or invalid content length");
  if (size > maxBytes) throw new PayloadTooLargeException("File too large");

  const fileType = req.headers["x-file-content-type"];
  const rawName = req.headers["x-original-filename"];
  let filename = typeof rawName === "string" && rawName ? rawName : "file";
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // keep the raw header value
  }

  return {
    size,
    filename,
    contentType:
      typeof fileType === "string" && fileType
        ? fileType
        : "application/octet-stream",
  };
}

export const ApiRawUpload = () =>
  applyDecorators(
    ApiConsumes("application/octet-stream"),
    ApiBody({ schema: { type: "string", format: "binary" } }),
    ApiHeader({
      name: "x-file-content-type",
      description: "The file's MIME type",
      required: false,
    }),
    ApiHeader({
      name: "x-original-filename",
      description: "The URI-encoded original filename",
      required: false,
    }),
  );
