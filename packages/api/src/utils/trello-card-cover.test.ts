import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  cardCoverPreviewWidths,
  getCardCoverPreviewKey,
} from "./cardCoverPreview";
import { importTrelloCardCover } from "./trello-card-cover";

const bucket = "attachments";
const attachmentPublicId = "attachment01";
const targetKey = "workspace/card/attachment01-cover.png";
const source = {
  kind: "attachment" as const,
  cardId: "card-1",
  attachmentId: "attachment-1",
  url: "https://trello.com/1/cards/card-1/attachments/attachment-1/download/cover.png",
  name: "cover.png",
  bytes: 123,
};

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

const createImage = () =>
  sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: "#0d9488",
    },
  })
    .png()
    .toBuffer();

describe("Trello card cover import", () => {
  it("stores and validates an uploaded attachment as native cover media", async () => {
    const image = await createImage();
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(image, {
          headers: {
            "content-length": String(image.byteLength),
            "content-type": "image/png",
          },
        }),
      ),
    ) as unknown as typeof fetch;
    const { objects, storage } = createStorage();

    const result = await importTrelloCardCover({
      bucket,
      attachmentPublicId,
      source: { ...source, bytes: image.byteLength },
      targetKey,
      apiKey: "api-key",
      token: "token",
      fetcher,
      storage,
    });

    expect(result).toEqual({
      contentType: "image/png",
      size: image.byteLength,
    });
    expect(fetcher).toHaveBeenCalledWith(
      new URL(source.url),
      expect.objectContaining({
        headers: {
          Authorization:
            'OAuth oauth_consumer_key="api-key", oauth_token="token"',
        },
        redirect: "manual",
      }),
    );
    expect(objects.has(targetKey)).toBe(true);
    for (const width of cardCoverPreviewWidths)
      expect(
        objects.has(getCardCoverPreviewKey(attachmentPublicId, width)),
      ).toBe(true);
  });

  it("does not forward Trello credentials to an allowed redirect host", async () => {
    const image = await createImage();
    const redirectUrl =
      "https://trello-attachments.s3.amazonaws.com/cover.png?key=leaked-key&token=leaked-token&X-Amz-Signature=keep";
    const sanitizedRedirectUrl =
      "https://trello-attachments.s3.amazonaws.com/cover.png?X-Amz-Signature=keep";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: redirectUrl },
        }),
      )
      .mockResolvedValueOnce(
        new Response(image, { headers: { "content-type": "image/png" } }),
      ) as unknown as typeof fetch;
    const { storage } = createStorage();

    await importTrelloCardCover({
      bucket,
      attachmentPublicId,
      source: { ...source, bytes: image.byteLength },
      targetKey,
      apiKey: "api-key",
      token: "token",
      fetcher,
      storage,
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      new URL(sanitizedRedirectUrl),
      expect.objectContaining({ headers: undefined, redirect: "manual" }),
    );
  });

  it("downloads an uploaded Trello background without credentials", async () => {
    const image = await createImage();
    const backgroundUrl =
      "https://trello-backgrounds.s3.amazonaws.com/SharedBackground/cover.png";
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(image, { headers: { "content-type": "image/png" } }),
      ),
    ) as unknown as typeof fetch;
    const { storage } = createStorage();

    await importTrelloCardCover({
      bucket,
      attachmentPublicId,
      source: {
        kind: "uploaded-background",
        backgroundId: "background-1",
        url: backgroundUrl,
        name: "cover.png",
        bytes: image.byteLength,
      },
      targetKey,
      apiKey: "api-key",
      token: "token",
      fetcher,
      storage,
    });

    expect(fetcher).toHaveBeenCalledWith(
      new URL(backgroundUrl),
      expect.objectContaining({ headers: undefined, redirect: "manual" }),
    );
  });

  it("removes credentials embedded in Trello metadata URLs", async () => {
    const image = await createImage();
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(image, { headers: { "content-type": "image/png" } }),
      ),
    ) as unknown as typeof fetch;
    const { storage } = createStorage();

    await importTrelloCardCover({
      bucket,
      attachmentPublicId,
      source: {
        ...source,
        bytes: image.byteLength,
        url: `${source.url}?key=leaked-key&token=leaked-token`,
      },
      targetKey,
      apiKey: "api-key",
      token: "token",
      fetcher,
      storage,
    });

    expect(fetcher).toHaveBeenCalledWith(
      new URL(source.url),
      expect.any(Object),
    );
  });

  it.each([
    "https://trello.com/1/cards/other-card/attachments/attachment-1/download/cover.png",
    "https://trello.com/1/cards/card-1/attachments/other-attachment/download/cover.png",
    "https://trello.com/1/cards/card-1/attachments/attachment-1/previews/cover.png",
    "https://trello.com/1/cards/card-1/attachments/attachment-1/download/path/cover.png",
  ])("rejects mismatched attachment route %s", async (url) => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const { storage } = createStorage();

    await expect(
      importTrelloCardCover({
        bucket,
        attachmentPublicId,
        source: { ...source, url },
        targetKey,
        apiKey: "api-key",
        token: "token",
        fetcher,
        storage,
      }),
    ).rejects.toThrow("does not match the selected cover");

    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    "https://127.0.0.1/internal.png",
    "https://evil.amazonaws.com/cover.png",
    "https://evil.atlassian.com/cover.png",
    "https://evil.cloudfront.net/cover.png",
  ])("rejects a redirect to untrusted host %s", async (redirectUrl) => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: redirectUrl },
        }),
      ),
    ) as unknown as typeof fetch;
    const { storage } = createStorage();

    await expect(
      importTrelloCardCover({
        bucket,
        attachmentPublicId,
        source,
        targetKey,
        apiKey: "api-key",
        token: "token",
        fetcher,
        storage,
      }),
    ).rejects.toThrow("redirected to an untrusted host");

    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects an oversized source before downloading it", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const { storage } = createStorage();

    await expect(
      importTrelloCardCover({
        bucket,
        attachmentPublicId,
        source: { ...source, bytes: 50 * 1024 * 1024 + 1 },
        targetKey,
        apiKey: "api-key",
        token: "token",
        fetcher,
        storage,
      }),
    ).rejects.toThrow("exceeds 50 MiB");

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("removes the source and previews when image validation fails", async () => {
    const body = new TextEncoder().encode("not an image");
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(body, { headers: { "content-type": "image/png" } }),
      ),
    ) as unknown as typeof fetch;
    const { objects, storage } = createStorage();

    await expect(
      importTrelloCardCover({
        bucket,
        attachmentPublicId,
        source: { ...source, bytes: body.byteLength },
        targetKey,
        apiKey: "api-key",
        token: "token",
        fetcher,
        storage,
      }),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE" });

    expect(objects.has(targetKey)).toBe(false);
    for (const width of cardCoverPreviewWidths)
      expect(
        objects.has(getCardCoverPreviewKey(attachmentPublicId, width)),
      ).toBe(false);
  });
});
