import { HttpStatus } from "@nestjs/common";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as SessionUtil from "../session.util.js";

const getSession = vi.hoisted(() => vi.fn());
vi.mock("@kan/auth/server", () => ({
  initAuth: () => ({ api: { getSession } }),
}));

let resolveUserFromHeaders: typeof SessionUtil.resolveUserFromHeaders;
beforeAll(async () => {
  ({ resolveUserFromHeaders } = await import("../session.util.js"));
});

const apiError = (code: string, details?: object) =>
  Object.assign(new Error(code), { name: "APIError", body: { code, details } });

beforeEach(() => {
  getSession.mockReset();
});

describe("resolveUserFromHeaders", () => {
  it("returns the session user", async () => {
    getSession.mockResolvedValue({ user: { id: "user_1" } });

    expect(await resolveUserFromHeaders(new Headers())).toEqual({
      user: { id: "user_1" },
    });
  });

  it("treats an invalid API key as signed out instead of surfacing better-auth's 403", async () => {
    getSession.mockRejectedValue(apiError("INVALID_API_KEY"));

    expect(await resolveUserFromHeaders(new Headers())).toEqual({
      user: null,
    });
  });

  it("returns 429 with a retry hint for a rate-limited API key", async () => {
    getSession.mockRejectedValue(
      apiError("RATE_LIMITED", { tryAgainIn: 4200 }),
    );

    await expect(resolveUserFromHeaders(new Headers())).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      message: "Rate limit exceeded for this API key. Try again in 5s.",
    });
  });
});
