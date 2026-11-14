import { afterEach, describe, expect, it, vi } from "vitest";

import { env } from "./env";

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reads process.env on the server", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://server.example");
    expect(env("NEXT_PUBLIC_BASE_URL")).toBe("https://server.example");
  });

  it("reads window.__ENV in the browser", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("__ENV", { NEXT_PUBLIC_BASE_URL: "https://browser.example" });
    expect(env("NEXT_PUBLIC_BASE_URL")).toBe("https://browser.example");
  });

  it("refuses non-public keys", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "secret");
    expect(() => env("BETTER_AUTH_SECRET" as `NEXT_PUBLIC_${string}`)).toThrow(
      "only reads NEXT_PUBLIC_",
    );
  });
});
