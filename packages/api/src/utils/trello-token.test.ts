import { describe, expect, it } from "vitest";

import { decryptTrelloToken, encryptTrelloToken } from "./trello-token";

describe("Trello token storage", () => {
  it("encrypts new tokens", () => {
    const token = "trello-token";
    const storedToken = encryptTrelloToken(token);

    expect(storedToken).not.toContain(token);
    expect(decryptTrelloToken(storedToken)).toBe(token);
  });

  it("continues to read legacy plaintext tokens", () => {
    expect(decryptTrelloToken("legacy-trello-token")).toBe(
      "legacy-trello-token",
    );
  });

  it("rejects corrupted encrypted tokens", () => {
    const storedToken = encryptTrelloToken("trello-token");

    expect(() => decryptTrelloToken(`${storedToken}corrupted`)).toThrow();
  });
});
