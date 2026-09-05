import { describe, expect, it, vi } from "vitest";

import {
  decryptTrelloToken,
  encryptTrelloToken,
  isEncryptedTrelloToken,
} from "./trello-token";

vi.hoisted(() => {
  process.env.BETTER_AUTH_SECRET = "test-only-trello-secret-123456789";
});

describe("Trello token storage", () => {
  it("encrypts new tokens", () => {
    const token = "trello-token";
    const storedToken = encryptTrelloToken(token);

    expect(storedToken).not.toContain(token);
    expect(isEncryptedTrelloToken(storedToken)).toBe(true);
    expect(decryptTrelloToken(storedToken)).toBe(token);
  });

  it("continues to read legacy plaintext tokens", () => {
    expect(isEncryptedTrelloToken("legacy-trello-token")).toBe(false);
    expect(decryptTrelloToken("legacy-trello-token")).toBe(
      "legacy-trello-token",
    );
  });

  it("rejects corrupted encrypted tokens", () => {
    const storedToken = encryptTrelloToken("trello-token");

    expect(() => decryptTrelloToken(`${storedToken}corrupted`)).toThrow();
  });
});
