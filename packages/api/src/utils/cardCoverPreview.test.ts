import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  cardCoverPreviewWidths,
  ensureCardCoverPreviews,
  getCardCoverPreviewKey,
} from "./cardCoverPreview";

const createStorage = (source: Uint8Array) => {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>([
    [
      "attachments/source",
      { body: source, contentType: "application/octet-stream" },
    ],
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

describe("card cover previews", () => {
  it("detects the image from bytes and writes bounded WebP derivatives", async () => {
    const source = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: "#0d9488",
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { objects, storage } = createStorage(source);

    const result = await ensureCardCoverPreviews({
      bucket: "attachments",
      attachmentPublicId: "attachment01",
      s3Key: "attachments/source",
      storage,
    });

    expect(result).toMatchObject({
      sourceContentType: "image/jpeg",
      reused: false,
    });
    expect(storage.putObject).toHaveBeenCalledTimes(3);

    for (const width of cardCoverPreviewWidths) {
      const preview = objects.get(
        getCardCoverPreviewKey("attachment01", width),
      );
      expect(preview?.contentType).toBe("image/webp");
      if (!preview) throw new Error(`Missing ${width}px preview`);
      const metadata = await sharp(preview.body).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBeLessThanOrEqual(width);
      expect(metadata.height).toBeGreaterThan(metadata.width);
      expect(metadata.orientation).toBeUndefined();
    }
  });

  it("reuses a complete derivative set without reading the original", async () => {
    const { objects, storage } = createStorage(new Uint8Array([1]));
    for (const width of cardCoverPreviewWidths) {
      objects.set(getCardCoverPreviewKey("attachment01", width), {
        body: new Uint8Array([1]),
        contentType: "image/webp",
      });
    }

    const result = await ensureCardCoverPreviews({
      bucket: "attachments",
      attachmentPublicId: "attachment01",
      s3Key: "attachments/source",
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
      ensureCardCoverPreviews({
        bucket: "attachments",
        attachmentPublicId: "attachment01",
        s3Key: "attachments/source",
        storage,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_IMAGE",
    });
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("recognizes AVIF from its decoded compression format", async () => {
    const source = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: "#0d9488",
      },
    })
      .avif()
      .toBuffer();
    const { storage } = createStorage(source);

    await expect(
      ensureCardCoverPreviews({
        bucket: "attachments",
        attachmentPublicId: "attachment01",
        s3Key: "attachments/source",
        storage,
      }),
    ).resolves.toMatchObject({ sourceContentType: "image/avif" });
  });

  it("rejects an oversized source before downloading it", async () => {
    const { storage } = createStorage(new Uint8Array([1]));
    storage.headObject.mockImplementation((_bucket, key) =>
      Promise.resolve(
        key === "attachments/source"
          ? { contentLength: 50 * 1024 * 1024 + 1, contentType: "image/png" }
          : null,
      ),
    );

    await expect(
      ensureCardCoverPreviews({
        bucket: "attachments",
        attachmentPublicId: "attachment01",
        s3Key: "attachments/source",
        storage,
      }),
    ).rejects.toMatchObject({
      code: "SOURCE_TOO_LARGE",
    });
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("removes a partial derivative set when preview storage fails", async () => {
    const source = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: "#0d9488",
      },
    })
      .png()
      .toBuffer();
    const { objects, storage } = createStorage(source);
    storage.putObject.mockImplementation((_bucket, key, body, contentType) => {
      if (key.endsWith("/640.webp"))
        return Promise.reject(new Error("Garage unavailable"));
      objects.set(key, { body, contentType });
      return Promise.resolve();
    });

    await expect(
      ensureCardCoverPreviews({
        bucket: "attachments",
        attachmentPublicId: "attachment01",
        s3Key: "attachments/source",
        storage,
      }),
    ).rejects.toMatchObject({ code: "STORAGE_FAILURE" });

    for (const width of cardCoverPreviewWidths)
      expect(objects.has(getCardCoverPreviewKey("attachment01", width))).toBe(
        false,
      );
    expect(storage.deleteObject).toHaveBeenCalledTimes(3);
  });
});
