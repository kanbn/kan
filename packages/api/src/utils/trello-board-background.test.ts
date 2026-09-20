import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  boardBackgroundPreviewWidths,
  getBoardBackgroundPreviewKey,
} from "./boardBackgroundPreview";
import { importTrelloBoardBackground } from "./trello-board-background";

const bucket = "attachments";
const boardPublicId = "board1234567";
const targetKey =
  "workspace1234/board-backgrounds/board1234567/trello-background";
const sourceUrl =
  "https://trello-backgrounds.s3.amazonaws.com/SharedBackground/image.jpg";

const createStorage = () => {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();

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

const createFetcher = (response: Response) =>
  vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

describe("Trello board background import", () => {
  it("stores an allowed raster image and creates native previews", async () => {
    const image = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: "#0d9488",
      },
    })
      .jpeg()
      .toBuffer();
    const fetcher = createFetcher(
      new Response(image, {
        headers: {
          "content-length": String(image.byteLength),
          "content-type": "image/jpeg",
        },
      }),
    );
    const { objects, storage } = createStorage();

    const result = await importTrelloBoardBackground({
      bucket,
      boardPublicId,
      sourceUrl,
      targetKey,
      fetcher,
      storage,
    });

    expect(result).toBe(targetKey);
    expect(fetcher).toHaveBeenCalledWith(
      new URL(sourceUrl),
      expect.objectContaining({ redirect: "error" }),
    );
    expect(objects.has(targetKey)).toBe(true);
    for (const width of boardBackgroundPreviewWidths)
      expect(
        objects.has(
          getBoardBackgroundPreviewKey(boardPublicId, targetKey, width),
        ),
      ).toBe(true);
  });

  it("rejects untrusted hosts before making a request", async () => {
    const fetcher = createFetcher(new Response());
    const { storage } = createStorage();

    await expect(
      importTrelloBoardBackground({
        bucket,
        boardPublicId,
        sourceUrl: "https://127.0.0.1/internal.jpg",
        targetKey,
        fetcher,
        storage,
      }),
    ).rejects.toThrow("not on an allowed CDN");

    expect(fetcher).not.toHaveBeenCalled();
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects a declared oversized response before reading it", async () => {
    const fetcher = createFetcher(
      new Response(new Uint8Array([1]), {
        headers: {
          "content-length": String(50 * 1024 * 1024 + 1),
          "content-type": "image/jpeg",
        },
      }),
    );
    const { storage } = createStorage();

    await expect(
      importTrelloBoardBackground({
        bucket,
        boardPublicId,
        sourceUrl,
        targetKey,
        fetcher,
        storage,
      }),
    ).rejects.toThrow("exceeds the 50 MiB limit");

    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("removes imported objects when native image validation fails", async () => {
    const fetcher = createFetcher(
      new Response(new TextEncoder().encode("not an image"), {
        headers: { "content-type": "image/jpeg" },
      }),
    );
    const { objects, storage } = createStorage();

    await expect(
      importTrelloBoardBackground({
        bucket,
        boardPublicId,
        sourceUrl,
        targetKey,
        fetcher,
        storage,
      }),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE" });

    expect(objects.has(targetKey)).toBe(false);
    for (const width of boardBackgroundPreviewWidths)
      expect(
        objects.has(
          getBoardBackgroundPreviewKey(boardPublicId, targetKey, width),
        ),
      ).toBe(false);
  });
});
