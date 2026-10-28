import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateAvatarUrl } from "@kan/shared/utils";

import { createAvatarUrlResolver } from "./avatarUrls";

vi.mock("@kan/shared/utils", () => ({
  generateAvatarUrl: vi.fn(),
}));

const mockGenerateAvatarUrl = vi.mocked(generateAvatarUrl);

describe("createAvatarUrlResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAvatarUrl.mockImplementation((imageKey) =>
      Promise.resolve(`https://example.com/${imageKey}`),
    );
  });

  it("reuses one generated URL for duplicate image keys", async () => {
    const resolveAvatarUrl = createAvatarUrlResolver();

    const urls = await Promise.all([
      resolveAvatarUrl("avatars/alice.png"),
      resolveAvatarUrl("avatars/alice.png"),
      resolveAvatarUrl("avatars/bob.png"),
    ]);

    expect(urls).toEqual([
      "https://example.com/avatars/alice.png",
      "https://example.com/avatars/alice.png",
      "https://example.com/avatars/bob.png",
    ]);
    expect(mockGenerateAvatarUrl).toHaveBeenCalledTimes(2);
  });

  it("does not share cached URLs between requests", async () => {
    await createAvatarUrlResolver()("avatars/alice.png");
    await createAvatarUrlResolver()("avatars/alice.png");

    expect(mockGenerateAvatarUrl).toHaveBeenCalledTimes(2);
  });
});
