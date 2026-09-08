import { createLogger } from "@kan/logger";
import {
  deleteObject,
  getObjectBytes,
  getObjectMetadata,
  putObject,
} from "@kan/shared/utils";

import type { BoardBackgroundPreviewStorage } from "./boardBackgroundPreview";
import {
  deleteBoardBackgroundObjects,
  ensureBoardBackgroundPreviews,
} from "./boardBackgroundPreview";

const logger = createLogger("trello-board-background");
const maxSourceBytes = 50 * 1024 * 1024;
const maxConcurrentImports = 2;
const allowedHosts = new Set([
  "d2k1ftgv7pobq7.cloudfront.net",
  "trello-backgrounds.s3.amazonaws.com",
]);
const allowedContentTypes = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

let activeImports = 0;
const pendingImports: (() => void)[] = [];

const acquireImportSlot = async () => {
  if (activeImports >= maxConcurrentImports)
    await new Promise<void>((resolve) => pendingImports.push(resolve));

  activeImports += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeImports -= 1;
    pendingImports.shift()?.();
  };
};

type TrelloBoardBackgroundStorage = BoardBackgroundPreviewStorage;

const createStorage = (): TrelloBoardBackgroundStorage => ({
  headObject: getObjectMetadata,
  getObject: getObjectBytes,
  putObject,
  deleteObject,
});

const assertAllowedUrl = (sourceUrl: string) => {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch (error) {
    throw new Error("Trello background URL is invalid", { cause: error });
  }

  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname))
    throw new Error("Trello background URL is not on an allowed CDN");

  return url;
};

const readBoundedBody = async (response: Response) => {
  if (!response.body) throw new Error("Trello background response has no body");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  const stream = response.body as unknown as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxSourceBytes)
      throw new Error("Trello background exceeds the 50 MiB limit");
    chunks.push(chunk);
  }

  if (totalBytes === 0) throw new Error("Trello background is empty");

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
};

export const importTrelloBoardBackground = async (args: {
  bucket: string;
  boardPublicId: string;
  sourceUrl: string;
  targetKey: string;
  fetcher?: typeof fetch;
  storage?: TrelloBoardBackgroundStorage;
}) => {
  const url = assertAllowedUrl(args.sourceUrl);
  const fetcher = args.fetcher ?? fetch;
  const storage = args.storage ?? createStorage();
  const releaseImportSlot = await acquireImportSlot();

  try {
    const response = await fetcher(url, {
      redirect: "error",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok)
      throw new Error(`Trello background returned HTTP ${response.status}`);

    const declaredLength = Number(response.headers.get("content-length"));
    if (declaredLength > maxSourceBytes)
      throw new Error("Trello background exceeds the 50 MiB limit");

    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (contentType && !allowedContentTypes.has(contentType))
      throw new Error("Trello background is not a supported raster image");

    const body = await readBoundedBody(response);

    try {
      await storage.putObject(
        args.bucket,
        args.targetKey,
        body,
        contentType ?? "application/octet-stream",
      );
      await ensureBoardBackgroundPreviews({
        bucket: args.bucket,
        boardPublicId: args.boardPublicId,
        s3Key: args.targetKey,
        storage,
      });
    } catch (error) {
      const deletions = await deleteBoardBackgroundObjects({
        bucket: args.bucket,
        boardPublicId: args.boardPublicId,
        s3Key: args.targetKey,
        storage,
      });
      deletions.forEach(({ key, result }) => {
        if (result?.status === "rejected")
          logger.warn(
            { err: result.reason, key, boardPublicId: args.boardPublicId },
            "Failed to clean up a Trello board background import",
          );
      });
      throw error;
    }

    return args.targetKey;
  } finally {
    releaseImportSlot();
  }
};
