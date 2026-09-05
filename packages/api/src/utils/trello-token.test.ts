import { describe, expect, it } from "vitest";

import {
  decryptTrelloToken,
  encryptTrelloToken,
  isEncryptedTrelloToken,
} from "./trello-token";

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
