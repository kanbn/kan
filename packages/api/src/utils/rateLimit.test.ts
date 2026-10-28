import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenOrIpIdentifier, withRateLimit } from "./rateLimit.js";

vi.mock("@kan/db/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => ({ debug: vi.fn() })),
}));

function makeReq(headers: Record<string, string> = {}): NextApiRequest {
  return {
    headers,
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;
}

describe("tokenOrIpIdentifier", () => {
  it("falls back to IP when no token is present", () => {
    const req = makeReq({ "x-forwarded-for": "203.0.113.5" });

    expect(tokenOrIpIdentifier(req)).toBe("203.0.113.5");
  });

  it("keys two different tokens into independent buckets", () => {
    const reqA = makeReq({ authorization: "Bearer token-a" });
    const reqB = makeReq({ authorization: "Bearer token-b" });

    expect(tokenOrIpIdentifier(reqA)).not.toBe(tokenOrIpIdentifier(reqB));
  });

  it("keys the same token to the same bucket regardless of caller IP", () => {
    const reqA = makeReq({
      authorization: "Bearer same-token",
      "x-forwarded-for": "203.0.113.5",
    });
    const reqB = makeReq({
      authorization: "Bearer same-token",
      "x-forwarded-for": "198.51.100.9",
    });

    expect(tokenOrIpIdentifier(reqA)).toBe(tokenOrIpIdentifier(reqB));
  });

  it("does not use the raw token as the bucket key", () => {
    const req = makeReq({ authorization: "Bearer super-secret-token" });

    expect(tokenOrIpIdentifier(req)).not.toContain("super-secret-token");
  });

  it("also accepts an x-api-key header", () => {
    const req = makeReq({ "x-api-key": "kan_test_token" });

    expect(tokenOrIpIdentifier(req)).toMatch(/^token_[0-9a-f]{64}$/);
  });
});

describe("withRateLimit", () => {
  beforeEach(() => {
    vi.stubEnv("DISABLE_RATE_LIMIT", "false");
  });

  it("uses a route-specific response when the limit is exceeded", async () => {
    const req = {
      headers: {},
      socket: { remoteAddress: "rate-limit-test" },
    } as unknown as NextApiRequest;
    const res = {} as NextApiResponse;
    const handler = vi.fn();
    const onRateLimit = vi.fn();
    const limitedHandler = withRateLimit(
      { points: 1, duration: 60, onRateLimit },
      handler,
    );

    await limitedHandler(req, res);
    await limitedHandler(req, res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(onRateLimit).toHaveBeenCalledWith(
      req,
      res,
      "Too many requests, please try again later.",
    );
  });
});
