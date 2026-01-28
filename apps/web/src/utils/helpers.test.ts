import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-runtime-env", () => ({
  env: vi.fn(),
}));

import { env } from "next-runtime-env";
import { getAvatarUrl } from "./helpers";

const mockEnv = env as ReturnType<typeof vi.fn>;

describe("getAvatarUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty string for null input", () => {
    expect(getAvatarUrl(null)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(getAvatarUrl("")).toBe("");
  });

  it("returns URL unchanged if already absolute http", () => {
    expect(getAvatarUrl("http://example.com/avatar.jpg")).toBe(
      "http://example.com/avatar.jpg",
    );
  });

  it("returns URL unchanged if already absolute https", () => {
    expect(getAvatarUrl("https://example.com/avatar.jpg")).toBe(
      "https://example.com/avatar.jpg",
    );
  });

  describe("path-style URLs (MinIO/LocalStack)", () => {
    it("constructs path-style URL when STORAGE_DOMAIN is not set", () => {
      mockEnv.mockImplementation((key: string) => {
        const vars: Record<string, string> = {
          NEXT_PUBLIC_STORAGE_URL: "http://s3.localtest.me:9000",
          NEXT_PUBLIC_AVATAR_BUCKET_NAME: "kan",
        };
        return vars[key];
      });

      expect(getAvatarUrl("user123/avatar.jpg")).toBe(
        "http://s3.localtest.me:9000/kan/user123/avatar.jpg",
      );
    });
  });

  describe("virtual-hosted URLs (Tigris/AWS S3)", () => {
    it("constructs virtual-hosted URL when USE_VIRTUAL_HOSTED_URLS is true and STORAGE_DOMAIN is set", () => {
      mockEnv.mockImplementation((key: string) => {
        const vars: Record<string, string> = {
          NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS: "true",
          NEXT_PUBLIC_STORAGE_DOMAIN: "fly.storage.tigris.dev",
          NEXT_PUBLIC_AVATAR_BUCKET_NAME: "kan-avatars",
          NEXT_PUBLIC_STORAGE_URL: "https://fly.storage.tigris.dev",
        };
        return vars[key];
      });

      expect(getAvatarUrl("user123/avatar.jpg")).toBe(
        "https://kan-avatars.fly.storage.tigris.dev/user123/avatar.jpg",
      );
    });

    it("uses path-style URL when USE_VIRTUAL_HOSTED_URLS is false even if STORAGE_DOMAIN is set", () => {
      mockEnv.mockImplementation((key: string) => {
        const vars: Record<string, string> = {
          NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS: "false",
          NEXT_PUBLIC_STORAGE_DOMAIN: "fly.storage.tigris.dev",
          NEXT_PUBLIC_AVATAR_BUCKET_NAME: "kan-avatars",
          NEXT_PUBLIC_STORAGE_URL: "https://fly.storage.tigris.dev",
        };
        return vars[key];
      });

      expect(getAvatarUrl("user123/avatar.jpg")).toBe(
        "https://fly.storage.tigris.dev/kan-avatars/user123/avatar.jpg",
      );
    });

    it("uses path-style URL when USE_VIRTUAL_HOSTED_URLS is not set even if STORAGE_DOMAIN is set", () => {
      mockEnv.mockImplementation((key: string) => {
        const vars: Record<string, string> = {
          NEXT_PUBLIC_STORAGE_DOMAIN: "fly.storage.tigris.dev",
          NEXT_PUBLIC_AVATAR_BUCKET_NAME: "kan-avatars",
          NEXT_PUBLIC_STORAGE_URL: "https://fly.storage.tigris.dev",
        };
        return vars[key];
      });

      expect(getAvatarUrl("user123/avatar.jpg")).toBe(
        "https://fly.storage.tigris.dev/kan-avatars/user123/avatar.jpg",
      );
    });
  });
});
