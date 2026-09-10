import { createLogger } from "@kan/logger";
import {
  deleteObject,
  getObjectBytes,
  getObjectMetadata,
  putObject,
} from "@kan/shared/utils";

import type { CardCoverPreviewStorage } from "./cardCoverPreview";
import {
  deleteCardCoverObjects,
  ensureCardCoverPreviews,
} from "./cardCoverPreview";

const logger = createLogger("trello-card-cover");

const maxSourceBytes = 50 * 1024 * 1024;
const maxConcurrentImports = 2;
const maxRedirects = 3;
const trelloHosts = new Set(["api.trello.com", "trello.com"]);
const trelloBackgroundHosts = new Set([
  "d2k1ftgv7pobq7.cloudfront.net",
  "trello-backgrounds.s3.amazonaws.com",
]);
const trelloRedirectHosts = new Set([
  ...trelloHosts,
  ...trelloBackgroundHosts,
  "trello-attachments.s3.amazonaws.com",
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
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

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

export type TrelloCardCoverSource =
  | {
      kind: "attachment";
      cardId: string;
      attachmentId: string;
      url: string;
      name: string;
      bytes?: number | null;
    }
  | {
      kind: "uploaded-background";
      backgroundId: string;
      url: string;
      name: string;
      bytes?: number | null;
    };

type TrelloCardCoverStorage = CardCoverPreviewStorage;

const createStorage = (): TrelloCardCoverStorage => ({
  headObject: getObjectMetadata,
  getObject: getObjectBytes,
  putObject,
  deleteObject,
});

const assertSourceUrl = (source: TrelloCardCoverSource) => {
  let url: URL;
  try {
    url = new URL(source.url);
  } catch (error) {
    throw new Error("Trello card cover URL is invalid", { cause: error });
  }

  if (url.protocol !== "https:" || (url.port && url.port !== "443"))
    throw new Error("Trello card cover URL must use HTTPS");
  if (url.username || url.password)
    throw new Error("Trello card cover URL must not contain credentials");

  url.searchParams.delete("key");
  url.searchParams.delete("token");

  if (source.kind === "uploaded-background") {
    if (!trelloBackgroundHosts.has(url.hostname))
      throw new Error("Trello card cover URL is not on an allowed CDN");
    return url;
  }

  const expectedPath = `/1/cards/${source.cardId}/attachments/${source.attachmentId}/download/`;
  const filenamePath = url.pathname.slice(expectedPath.length);
  if (
    !trelloHosts.has(url.hostname) ||
    !url.pathname.startsWith(expectedPath) ||
    !filenamePath ||
    filenamePath.includes("/")
  )
    throw new Error("Trello attachment URL does not match the selected cover");

  return url;
};

const escapeOAuthValue = (value: string) =>
  value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');

const getAuthorization = (apiKey: string, token: string) =>
  `OAuth oauth_consumer_key="${escapeOAuthValue(apiKey)}", oauth_token="${escapeOAuthValue(token)}"`;

const fetchSource = async (args: {
  source: TrelloCardCoverSource;
  apiKey: string;
  token: string;
  fetcher: typeof fetch;
}) => {
  const initialUrl = assertSourceUrl(args.source);
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const sendAuthorization =
      args.source.kind === "attachment" &&
      currentUrl.origin === initialUrl.origin;
    const response = await args.fetcher(currentUrl, {
      headers: sendAuthorization
        ? { Authorization: getAuthorization(args.apiKey, args.token) }
        : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });

    if (!redirectStatuses.has(response.status)) return response;
    if (redirectCount === maxRedirects)
      throw new Error("Trello card cover redirected too many times");

    await response.body?.cancel();
    const location = response.headers.get("location");
    if (!location)
      throw new Error("Trello card cover redirect has no location");

    const nextUrl = new URL(location, currentUrl);
    if (
      nextUrl.protocol !== "https:" ||
      (nextUrl.port && nextUrl.port !== "443") ||
      nextUrl.username ||
      nextUrl.password ||
      !trelloRedirectHosts.has(nextUrl.hostname)
    )
      throw new Error("Trello card cover redirected to an untrusted host");

    nextUrl.searchParams.delete("key");
    nextUrl.searchParams.delete("token");
    currentUrl = nextUrl;
  }

  throw new Error("Trello card cover redirect failed");
};

const readBoundedBody = async (response: Response) => {
  if (!response.body) throw new Error("Trello card cover response has no body");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const stream = response.body as unknown as AsyncIterable<Uint8Array>;

  for await (const chunk of stream) {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxSourceBytes)
      throw new Error("Trello card cover exceeds the 50 MiB limit");
    chunks.push(chunk);
  }

  if (totalBytes === 0) throw new Error("Trello card cover is empty");

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return body;
};

export const importTrelloCardCover = async (args: {
  bucket: string;
  attachmentPublicId: string;
  source: TrelloCardCoverSource;
  targetKey: string;
  apiKey: string;
  token: string;
  fetcher?: typeof fetch;
  storage?: TrelloCardCoverStorage;
}) => {
  if (
    typeof args.source.bytes === "number" &&
    (args.source.bytes <= 0 || args.source.bytes > maxSourceBytes)
  )
    throw new Error("Trello card cover size is invalid or exceeds 50 MiB");

  const fetcher = args.fetcher ?? fetch;
  const storage = args.storage ?? createStorage();
  const releaseImportSlot = await acquireImportSlot();

  try {
    const response = await fetchSource({
      source: args.source,
      apiKey: args.apiKey,
      token: args.token,
      fetcher,
    });
    if (!response.ok)
      throw new Error(`Trello card cover returned HTTP ${response.status}`);

    const declaredLength = Number(response.headers.get("content-length"));
    if (declaredLength > maxSourceBytes)
      throw new Error("Trello card cover exceeds the 50 MiB limit");

    const responseContentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (responseContentType && !allowedContentTypes.has(responseContentType))
      throw new Error("Trello card cover is not a supported raster image");

    const body = await readBoundedBody(response);

    try {
      await storage.putObject(
        args.bucket,
        args.targetKey,
        body,
        responseContentType ?? "application/octet-stream",
      );
      const preview = await ensureCardCoverPreviews({
        bucket: args.bucket,
        attachmentPublicId: args.attachmentPublicId,
        s3Key: args.targetKey,
        storage,
      });
      const contentType =
        preview.sourceContentType ??
        responseContentType ??
        "application/octet-stream";

      if (contentType !== responseContentType)
        await storage.putObject(args.bucket, args.targetKey, body, contentType);

      return { contentType, size: body.byteLength };
    } catch (error) {
      const deletions = await deleteCardCoverObjects({
        bucket: args.bucket,
        attachmentPublicId: args.attachmentPublicId,
        s3Key: args.targetKey,
        storage,
      });
      deletions.forEach(({ key, result }) => {
        if (result?.status === "rejected")
          logger.warn(
            { err: result.reason, key },
            "Failed to clean up a Trello card cover import",
          );
      });
      throw error;
    }
  } finally {
    releaseImportSlot();
  }
};
