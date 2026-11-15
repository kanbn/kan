import { env } from "@kan/shared/env";

/** Sends a file to an API upload endpoint as a raw body, with its type and name in headers. */
export const uploadFile = (path: string, file: Blob, filename: string) =>
  fetch(`${env("NEXT_PUBLIC_BASE_URL") ?? ""}/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-file-content-type": file.type || "application/octet-stream",
      "x-original-filename": encodeURIComponent(filename),
    },
    body: file,
  });
