import { NextRequest } from "next/server";
import { env } from "next-runtime-env";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { middleware } from "./middleware";

vi.mock("next-runtime-env", () => ({
  env: vi.fn(),
}));

const mockedEnv = vi.mocked(env);

describe("middleware", () => {
  beforeEach(() => {
    mockedEnv.mockReset();
  });

  it("uses the configured public URL for self-hosted login redirects", () => {
    mockedEnv.mockImplementation((key) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.example.com";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "self-hosted";
    });

    const response = middleware(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://kan.example.com/login",
    );
  });

  it.each([undefined, ""])(
    "falls back to the request URL when the public URL is %s",
    (publicBaseUrl) => {
      mockedEnv.mockImplementation((key) => {
        if (key === "NEXT_PUBLIC_BASE_URL") return publicBaseUrl;
        if (key === "NEXT_PUBLIC_KAN_ENV") return "self-hosted";
      });

      const response = middleware(new NextRequest("http://localhost:3000/"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/login",
      );
    },
  );

  it("falls back to the request URL when the public URL is malformed", () => {
    mockedEnv.mockImplementation((key) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "kan.example.com";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "self-hosted";
    });

    const response = middleware(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
});
