import sharp from "sharp";

import {
  deleteObject,
  getObjectBytes,
  getObjectMetadata,
  putObject,
} from "@kan/shared/utils";

export const cardCoverPreviewWidths = [320, 640, 1280] as const;
export type CardCoverPreviewWidth = (typeof cardCoverPreviewWidths)[number];

const previewVersion = "v1";
const maxSourceBytes = 50 * 1024 * 1024;
const maxSourcePixels = 40_000_000;
const maxPreviewBytes = 10 * 1024 * 1024;
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

export class CardCoverPreviewError extends Error {
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
    this.name = "CardCoverPreviewError";
  }
}

export const getCardCoverPreviewKey = (
  attachmentPublicId: string,
  width: CardCoverPreviewWidth,
) =>
  `card-cover-previews/${previewVersion}/${attachmentPublicId}/${width}.webp`;

interface StoredObjectMetadata {
  contentLength?: number;
  contentType?: string;
}

interface CardCoverPreviewStorage {
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

const createStorage = (): CardCoverPreviewStorage => ({
  headObject: getObjectMetadata,
  getObject: getObjectBytes,
  putObject,
  deleteObject,
});

export const inspectStoredObject = async (
  bucket: string,
  key: string,
  storage: CardCoverPreviewStorage = createStorage(),
) => storage.headObject(bucket, key);

export const ensureCardCoverPreviews = async (args: {
  bucket: string;
  attachmentPublicId: string;
  s3Key: string;
  storage?: CardCoverPreviewStorage;
}) => {
  const storage = args.storage ?? createStorage();
  const previewKeys = cardCoverPreviewWidths.map((width) => ({
    width,
    key: getCardCoverPreviewKey(args.attachmentPublicId, width),
  }));
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
      return {
        previewKeys,
        sourceContentType: null,
        reused: true,
      };

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
      return {
        previewKeys,
        sourceContentType: null,
        reused: true,
      };

    const sourceMetadata = await storage.headObject(args.bucket, args.s3Key);
    if (!sourceMetadata)
      throw new CardCoverPreviewError(
        "SOURCE_NOT_FOUND",
        "Attachment object was not found",
      );

    if (
      typeof sourceMetadata.contentLength !== "number" ||
      sourceMetadata.contentLength <= 0 ||
      sourceMetadata.contentLength > maxSourceBytes
    )
      throw new CardCoverPreviewError(
        "SOURCE_TOO_LARGE",
        "Attachment object size is invalid or exceeds 50 MiB",
      );

    const source = await storage.getObject(args.bucket, args.s3Key);
    if (
      source.byteLength <= 0 ||
      source.byteLength > maxSourceBytes ||
      source.byteLength !== sourceMetadata.contentLength
    )
      throw new CardCoverPreviewError(
        "SOURCE_TOO_LARGE",
        "Attachment body size is invalid or changed while being read",
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
      throw new CardCoverPreviewError(
        "INVALID_IMAGE",
        "Attachment could not be decoded as an image",
        { cause: error },
      );
    }
    const sourceContentType =
      metadata.format === "heif" && metadata.compression === "av1"
        ? "image/avif"
        : supportedFormats.get(metadata.format);

    if (!sourceContentType)
      throw new CardCoverPreviewError(
        "UNSUPPORTED_IMAGE",
        "Attachment is not a supported raster image",
      );

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > maxSourcePixels
    )
      throw new CardCoverPreviewError(
        "INVALID_IMAGE",
        "Attachment image dimensions are invalid or too large",
      );

    const previews: { width: CardCoverPreviewWidth; key: string }[] = [];
    for (const { width, key } of previewKeys) {
      let body: Buffer;
      try {
        body = await image
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
      } catch (error) {
        throw new CardCoverPreviewError(
          "INVALID_IMAGE",
          `Failed to render ${width}px card cover preview`,
          { cause: error },
        );
      }

      if (body.byteLength <= 0 || body.byteLength > maxPreviewBytes)
        throw new CardCoverPreviewError(
          "INVALID_IMAGE",
          `Generated ${width}px preview has an invalid size`,
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

    if (error instanceof CardCoverPreviewError) throw error;
    throw new CardCoverPreviewError(
      "STORAGE_FAILURE",
      "Failed to read or store card cover previews",
      { cause: error },
    );
  } finally {
    releasePreviewBuildSlot?.();
  }
};
