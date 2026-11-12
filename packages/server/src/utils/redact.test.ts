import { describe, expect, it } from "vitest";

import { redactSensitive } from "./redact";

describe("redactSensitive", () => {
  it("masks secret keys in any case or separator style", () => {
    expect(
      redactSensitive({
        token: "a",
        accessToken: "b",
        refresh_token: "c",
        newPassword: "d",
        secret: "e",
        "x-api-key": "f",
        apiKey: "g",
        license_key: "h",
        prev_license_key: "i",
        code: "j",
        Authorization: "k",
        cookie: "l",
        "Set-Cookie": "m",
        signature: "n",
        inviteCode: "o",
      }),
    ).toEqual({
      token: "[REDACTED]",
      accessToken: "[REDACTED]",
      refresh_token: "[REDACTED]",
      newPassword: "[REDACTED]",
      secret: "[REDACTED]",
      "x-api-key": "[REDACTED]",
      apiKey: "[REDACTED]",
      license_key: "[REDACTED]",
      prev_license_key: "[REDACTED]",
      code: "[REDACTED]",
      Authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      "Set-Cookie": "[REDACTED]",
      signature: "[REDACTED]",
      inviteCode: "[REDACTED]",
    });
  });

  it("keeps non-secret keys, including ones that only contain 'code'", () => {
    const input = {
      name: "Board",
      colourCode: "#ffffff",
      statusCode: 200,
      boardPublicId: "pub123",
    };

    expect(redactSensitive(input)).toEqual(input);
  });

  it("masks nested objects and arrays", () => {
    expect(
      redactSensitive({
        webhook: { url: "https://example.com", secret: "s" },
        items: [{ token: "t", id: 1 }, "plain"],
      }),
    ).toEqual({
      webhook: { url: "https://example.com", secret: "[REDACTED]" },
      items: [{ token: "[REDACTED]", id: 1 }, "plain"],
    });
  });

  it("returns primitives, null, and Dates unchanged", () => {
    const date = new Date("2026-01-01T00:00:00Z");

    expect(redactSensitive("token")).toBe("token");
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive({ dueDate: date })).toEqual({ dueDate: date });
  });

  it("does not mutate the original value", () => {
    const input = { token: "t", nested: { secret: "s" } };

    redactSensitive(input);

    expect(input).toEqual({ token: "t", nested: { secret: "s" } });
  });

  it("stops at the depth limit", () => {
    let deep: Record<string, unknown> = { leaf: "value" };
    for (let i = 0; i < 20; i++) deep = { child: deep };

    expect(JSON.stringify(redactSensitive(deep))).toContain("[REDACTED]");
    expect(JSON.stringify(redactSensitive(deep))).not.toContain("value");
  });
});
