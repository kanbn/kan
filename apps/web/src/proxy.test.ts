import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "@kan/shared/env";

import { proxy } from "./proxy";

vi.mock("@kan/shared/env", () => ({
  env: vi.fn(),
}));

const mockedEnv = vi.mocked(env);

describe("proxy", () => {
  beforeEach(() => {
    mockedEnv.mockReset();
  });

  it("uses the configured public URL for self-hosted login redirects", () => {
    mockedEnv.mockImplementation((key) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.example.com";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "self-hosted";
    });

    const response = proxy(new NextRequest("http://localhost:3000/"));

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

      const response = proxy(new NextRequest("http://localhost:3000/"));

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

    const response = proxy(new NextRequest("http://localhost:3000/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("redirects /forgot-password to login when email is disabled", () => {
    mockedEnv.mockImplementation((key) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.example.com";
      if (key === "NEXT_PUBLIC_DISABLE_EMAIL") return "true";
    });

    const response = proxy(
      new NextRequest("http://localhost:3000/forgot-password"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://kan.example.com/login",
    );
  });

  it.each([undefined, "", "false"])(
    "does not redirect /forgot-password when email is disabled is %s",
    (disableEmail) => {
      mockedEnv.mockImplementation((key) => {
        if (key === "NEXT_PUBLIC_DISABLE_EMAIL") return disableEmail;
        if (key === "NEXT_PUBLIC_KAN_ENV") return "cloud";
      });

      const response = proxy(
        new NextRequest("http://localhost:3000/forgot-password"),
      );

      expect(response.headers.get("location")).toBeNull();
    },
  );
});
