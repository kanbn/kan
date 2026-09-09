import { describe, expect, it } from "vitest";

import { getApiKeyFromHeaders } from "./plugins";

describe("getApiKeyFromHeaders", () => {
  it("extracts the token from an uppercase Bearer scheme", () => {
    const headers = new Headers({ authorization: "Bearer kan_test_token" });
    expect(getApiKeyFromHeaders(headers)).toBe("kan_test_token");
  });

  it("extracts the token from a lowercase bearer scheme", () => {
    const headers = new Headers({ authorization: "bearer kan_test_token" });
    expect(getApiKeyFromHeaders(headers)).toBe("kan_test_token");
  });

  it("falls back to the x-api-key header when there's no Authorization header", () => {
    const headers = new Headers({ "x-api-key": "kan_test_token" });
    expect(getApiKeyFromHeaders(headers)).toBe("kan_test_token");
  });

  it("returns null when neither header is present", () => {
    const headers = new Headers();
    expect(getApiKeyFromHeaders(headers)).toBeNull();
  });

  it("returns null when headers is null or undefined", () => {
    expect(getApiKeyFromHeaders(null)).toBeNull();
    expect(getApiKeyFromHeaders(undefined)).toBeNull();
  });
});
