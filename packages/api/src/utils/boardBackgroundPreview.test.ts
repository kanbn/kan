import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  boardBackgroundPreviewWidths,
  ensureBoardBackgroundPreviews,
  getBoardBackgroundPreviewKey,
} from "./boardBackgroundPreview";

const sourceKey = "workspace/board-backgrounds/board1234567/source.jpg";
const boardPublicId = "board1234567";

const createStorage = (source: Uint8Array) => {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>([
    [sourceKey, { body: source, contentType: "application/octet-stream" }],
  ]);

  return {
    objects,
    storage: {
      headObject: vi.fn((_bucket: string, key: string) => {
        const object = objects.get(key);
        return Promise.resolve(
          object
            ? {
                contentLength: object.body.byteLength,
                contentType: object.contentType,
              }
            : null,
        );
      }),
      getObject: vi.fn((_bucket: string, key: string) => {
        const object = objects.get(key);
        return object
          ? Promise.resolve(object.body)
          : Promise.reject(new Error("not found"));
      }),
      putObject: vi.fn(
        (
          _bucket: string,
          key: string,
          body: Uint8Array,
          contentType: string,
        ) => {
          objects.set(key, { body, contentType });
          return Promise.resolve();
        },
      ),
      deleteObject: vi.fn((_bucket: string, key: string) => {
        objects.delete(key);
        return Promise.resolve();
      }),
    },
  };
};

describe("board background previews", () => {
  it("uses source-specific preview keys", () => {
    expect(
      getBoardBackgroundPreviewKey(boardPublicId, sourceKey, 960),
    ).not.toBe(
      getBoardBackgroundPreviewKey(
        boardPublicId,
        `${sourceKey}-replacement`,
        960,
      ),
    );
  });

  it("detects image bytes and writes bounded WebP derivatives", async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: "#0d9488",
      },
    })
      .jpeg()
      .toBuffer();
    const { objects, storage } = createStorage(source);

    const result = await ensureBoardBackgroundPreviews({
      bucket: "attachments",
      boardPublicId,
      s3Key: sourceKey,
      storage,
    });

    expect(result).toMatchObject({
      sourceContentType: "image/jpeg",
      reused: false,
    });
    expect(storage.putObject).toHaveBeenCalledTimes(3);

    for (const width of boardBackgroundPreviewWidths) {
      const preview = objects.get(
        getBoardBackgroundPreviewKey(boardPublicId, sourceKey, width),
      );
      expect(preview?.contentType).toBe("image/webp");
      if (!preview) throw new Error(`Missing ${width}px preview`);
      const metadata = await sharp(preview.body).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBeLessThanOrEqual(width);
    }
  });

  it("reuses a complete derivative set without reading the original", async () => {
    const { objects, storage } = createStorage(new Uint8Array([1]));
    for (const width of boardBackgroundPreviewWidths) {
      objects.set(
        getBoardBackgroundPreviewKey(boardPublicId, sourceKey, width),
        { body: new Uint8Array([1]), contentType: "image/webp" },
      );
    }

    const result = await ensureBoardBackgroundPreviews({
      bucket: "attachments",
      boardPublicId,
      s3Key: sourceKey,
      storage,
    });

    expect(result.reused).toBe(true);
    expect(storage.getObject).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects spoofed non-image bytes", async () => {
    const { storage } = createStorage(
      new TextEncoder().encode("<svg><script>alert(1)</script></svg>"),
    );

    await expect(
      ensureBoardBackgroundPreviews({
        bucket: "attachments",
        boardPublicId,
        s3Key: sourceKey,
        storage,
      }),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects an oversized source before downloading it", async () => {
    const { storage } = createStorage(new Uint8Array([1]));
    storage.headObject.mockImplementation((_bucket, key) =>
      Promise.resolve(
        key === sourceKey
          ? { contentLength: 50 * 1024 * 1024 + 1, contentType: "image/png" }
          : null,
      ),
    );

    await expect(
      ensureBoardBackgroundPreviews({
        bucket: "attachments",
        boardPublicId,
        s3Key: sourceKey,
        storage,
      }),
    ).rejects.toMatchObject({ code: "SOURCE_TOO_LARGE" });
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("removes partial derivatives when preview storage fails", async () => {
    const source = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: "#0d9488",
      },
    })
      .png()
      .toBuffer();
    const { objects, storage } = createStorage(source);
    storage.putObject.mockImplementation((_bucket, key, body, contentType) => {
      if (key.endsWith("/960.webp"))
        return Promise.reject(new Error("Garage unavailable"));
      objects.set(key, { body, contentType });
      return Promise.resolve();
    });

    await expect(
      ensureBoardBackgroundPreviews({
        bucket: "attachments",
        boardPublicId,
        s3Key: sourceKey,
        storage,
      }),
    ).rejects.toMatchObject({ code: "STORAGE_FAILURE" });

    for (const width of boardBackgroundPreviewWidths)
      expect(
        objects.has(
          getBoardBackgroundPreviewKey(boardPublicId, sourceKey, width),
        ),
      ).toBe(false);
    expect(storage.deleteObject).toHaveBeenCalledTimes(3);
  });
});
