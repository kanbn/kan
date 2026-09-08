import { createHash } from "node:crypto";
import sharp from "sharp";

import {
  copyObject,
  deleteObject,
  getObjectBytes,
  getObjectMetadata,
  putObject,
} from "@kan/shared/utils";

export const boardBackgroundPreviewWidths = [480, 960, 1920] as const;
export type BoardBackgroundPreviewWidth =
  (typeof boardBackgroundPreviewWidths)[number];

const previewVersion = "v1";
const maxSourceBytes = 50 * 1024 * 1024;
const maxSourcePixels = 40_000_000;
const maxPreviewBytes = 15 * 1024 * 1024;
const maxConcurrentPreviewBuilds = 2;

let activePreviewBuilds = 0;
const pendingPreviewBuilds: (() => void)[] = [];

const acquirePreviewBuildSlot = async () => {
  if (activePreviewBuilds >= maxConcurrentPreviewBuilds)
    await new Promise<void>((resolve) => pendingPreviewBuilds.push(resolve));

  activePreviewBuilds += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activePreviewBuilds -= 1;
    pendingPreviewBuilds.shift()?.();
  };
};

const supportedFormats = new Map([
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
]);

export class BoardBackgroundPreviewError extends Error {
  constructor(
    public readonly code:
      | "SOURCE_NOT_FOUND"
      | "SOURCE_TOO_LARGE"
      | "UNSUPPORTED_IMAGE"
      | "INVALID_IMAGE"
      | "STORAGE_FAILURE",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BoardBackgroundPreviewError";
  }
}

const getSourceId = (s3Key: string) =>
  createHash("sha256").update(s3Key).digest("hex").slice(0, 24);

export const getBoardBackgroundPreviewKey = (
  boardPublicId: string,
  s3Key: string,
  width: BoardBackgroundPreviewWidth,
) =>
  `board-background-previews/${previewVersion}/${boardPublicId}/${getSourceId(s3Key)}/${width}.webp`;

interface StoredObjectMetadata {
  contentLength?: number;
  contentType?: string;
}

export interface BoardBackgroundPreviewStorage {
  headObject: (
    bucket: string,
    key: string,
  ) => Promise<StoredObjectMetadata | null>;
  getObject: (bucket: string, key: string) => Promise<Uint8Array>;
  putObject: (
    bucket: string,
    key: string,
    body: Uint8Array,
    contentType: string,
  ) => Promise<void>;
  deleteObject: (bucket: string, key: string) => Promise<void>;
}

export interface BoardBackgroundCloneStorage
  extends BoardBackgroundPreviewStorage {
  copyObject: (
    bucket: string,
    sourceKey: string,
    targetKey: string,
  ) => Promise<void>;
}

const createStorage = (): BoardBackgroundPreviewStorage => ({
  headObject: getObjectMetadata,
  getObject: getObjectBytes,
  putObject,
  deleteObject,
});

const createCloneStorage = (): BoardBackgroundCloneStorage => ({
  ...createStorage(),
  copyObject,
});

export const inspectBoardBackgroundObject = async (
  bucket: string,
  key: string,
  storage: BoardBackgroundPreviewStorage = createStorage(),
) => storage.headObject(bucket, key);

export const getBoardBackgroundPreviewKeys = (
  boardPublicId: string,
  s3Key: string,
) =>
  boardBackgroundPreviewWidths.map((width) => ({
    width,
    key: getBoardBackgroundPreviewKey(boardPublicId, s3Key, width),
  }));

export const deleteBoardBackgroundObjects = async (args: {
  bucket: string;
  boardPublicId: string;
  s3Key: string;
  storage?: BoardBackgroundPreviewStorage;
}) => {
  const storage = args.storage ?? createStorage();
  const keys = [
    args.s3Key,
    ...getBoardBackgroundPreviewKeys(args.boardPublicId, args.s3Key).map(
      ({ key }) => key,
    ),
  ];
  const results = await Promise.allSettled(
    keys.map((key) => storage.deleteObject(args.bucket, key)),
  );

  return keys.map((key, index) => ({ key, result: results[index] }));
};

export const ensureBoardBackgroundPreviews = async (args: {
  bucket: string;
  boardPublicId: string;
  s3Key: string;
  storage?: BoardBackgroundPreviewStorage;
}) => {
  const storage = args.storage ?? createStorage();
  const previewKeys = getBoardBackgroundPreviewKeys(
    args.boardPublicId,
    args.s3Key,
  );
  let releasePreviewBuildSlot: (() => void) | undefined;

  try {
    const existingPreviews = await Promise.all(
      previewKeys.map(({ key }) => storage.headObject(args.bucket, key)),
    );
    const previewsAreComplete = existingPreviews.every(
      (preview) =>
        preview?.contentType === "image/webp" &&
        typeof preview.contentLength === "number" &&
        preview.contentLength > 0,
    );

    if (previewsAreComplete)
      return { previewKeys, sourceContentType: null, reused: true };

    releasePreviewBuildSlot = await acquirePreviewBuildSlot();

    const previewsAfterWaiting = await Promise.all(
      previewKeys.map(({ key }) => storage.headObject(args.bucket, key)),
    );
    if (
      previewsAfterWaiting.every(
        (preview) =>
          preview?.contentType === "image/webp" &&
          typeof preview.contentLength === "number" &&
          preview.contentLength > 0,
      )
    )
      return { previewKeys, sourceContentType: null, reused: true };

    const sourceMetadata = await storage.headObject(args.bucket, args.s3Key);
    if (!sourceMetadata)
      throw new BoardBackgroundPreviewError(
        "SOURCE_NOT_FOUND",
        "Board background object was not found",
      );

    if (
      typeof sourceMetadata.contentLength !== "number" ||
      sourceMetadata.contentLength <= 0 ||
      sourceMetadata.contentLength > maxSourceBytes
    )
      throw new BoardBackgroundPreviewError(
        "SOURCE_TOO_LARGE",
        "Board background object size is invalid or exceeds 50 MiB",
      );

    const source = await storage.getObject(args.bucket, args.s3Key);
    if (
      source.byteLength <= 0 ||
      source.byteLength > maxSourceBytes ||
      source.byteLength !== sourceMetadata.contentLength
    )
      throw new BoardBackgroundPreviewError(
        "SOURCE_TOO_LARGE",
        "Board background body size is invalid or changed while being read",
      );

    let image: sharp.Sharp;
    let metadata: sharp.Metadata;
    try {
      image = sharp(source, {
        failOn: "error",
        limitInputPixels: maxSourcePixels,
        pages: 1,
      }).rotate();
      metadata = await image.metadata();
    } catch (error) {
      throw new BoardBackgroundPreviewError(
        "INVALID_IMAGE",
        "Board background could not be decoded as an image",
        { cause: error },
      );
    }

    const sourceContentType =
      metadata.format === "heif" && metadata.compression === "av1"
        ? "image/avif"
        : supportedFormats.get(metadata.format);

    if (!sourceContentType)
      throw new BoardBackgroundPreviewError(
        "UNSUPPORTED_IMAGE",
        "Board background is not a supported raster image",
      );

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > maxSourcePixels
    )
      throw new BoardBackgroundPreviewError(
        "INVALID_IMAGE",
        "Board background dimensions are invalid or too large",
      );

    const previews: {
      width: BoardBackgroundPreviewWidth;
      key: string;
    }[] = [];
    for (const { width, key } of previewKeys) {
      let body: Buffer;
      try {
        body = await image
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch (error) {
        throw new BoardBackgroundPreviewError(
          "INVALID_IMAGE",
          `Failed to render ${width}px board background preview`,
          { cause: error },
        );
      }

      if (body.byteLength <= 0 || body.byteLength > maxPreviewBytes)
        throw new BoardBackgroundPreviewError(
          "INVALID_IMAGE",
          `Generated ${width}px board background preview has an invalid size`,
        );

      await storage.putObject(args.bucket, key, body, "image/webp");
      previews.push({ width, key });
    }

    return { previewKeys: previews, sourceContentType, reused: false };
  } catch (error) {
    if (releasePreviewBuildSlot)
      await Promise.allSettled(
        previewKeys.map(({ key }) => storage.deleteObject(args.bucket, key)),
      );

    if (error instanceof BoardBackgroundPreviewError) throw error;
    throw new BoardBackgroundPreviewError(
      "STORAGE_FAILURE",
      "Failed to read or store board background previews",
      { cause: error },
    );
  } finally {
    releasePreviewBuildSlot?.();
  }
};

export const cloneBoardBackgroundObjects = async (args: {
  bucket: string;
  sourceKey: string;
  targetBoardPublicId: string;
  targetKey: string;
  storage?: BoardBackgroundCloneStorage;
}) => {
  const storage = args.storage ?? createCloneStorage();

  try {
    await storage.copyObject(args.bucket, args.sourceKey, args.targetKey);
    await ensureBoardBackgroundPreviews({
      bucket: args.bucket,
      boardPublicId: args.targetBoardPublicId,
      s3Key: args.targetKey,
      storage,
    });
  } catch (error) {
    await deleteBoardBackgroundObjects({
      bucket: args.bucket,
      boardPublicId: args.targetBoardPublicId,
      s3Key: args.targetKey,
      storage,
    });
    throw error;
  }

  return args.targetKey;
};
