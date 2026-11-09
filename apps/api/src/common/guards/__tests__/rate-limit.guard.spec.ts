import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { HttpException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RateLimitGuard } from "../rate-limit.guard.js";

const mockLimiter = { consume: vi.fn() };

function call(
  headers: Record<string, string>,
  skip = false,
  socket: { remoteAddress?: string } = {},
) {
  const reflector = {
    getAllAndOverride: () => skip,
  } as unknown as Reflector;
  const request = { headers, socket };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  const guard = new RateLimitGuard(mockLimiter as never, reflector);
  return guard.canActivate(context);
}

describe("RateLimitGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DISABLE_RATE_LIMIT;
  });

  afterEach(() => {
    delete process.env.DISABLE_RATE_LIMIT;
  });

  it("allows the request when under the limit", async () => {
    mockLimiter.consume.mockResolvedValue(undefined);

    await expect(call({}, false, { remoteAddress: "1.2.3.4" })).resolves.toBe(
      true,
    );
    expect(mockLimiter.consume).toHaveBeenCalledWith("1.2.3.4");
  });

  it("identifies by a hashed token when an API key is present, not IP", async () => {
    mockLimiter.consume.mockResolvedValue(undefined);

    await call({ "x-api-key": "sk_live_abc" }, false, {
      remoteAddress: "1.2.3.4",
    });

    const key = mockLimiter.consume.mock.calls[0]?.[0] as string;
    expect(key).toMatch(/^token_[0-9a-f]{64}$/);
  });

  it("throws 429 once the limiter rejects", async () => {
    mockLimiter.consume.mockRejectedValue({ remainingPoints: 0 });

    const result = call({}, false, { remoteAddress: "1.2.3.4" });
    await expect(result).rejects.toBeInstanceOf(HttpException);
    await expect(result).rejects.toMatchObject({ status: 429 });
  });

  it("fails open on a limiter backend error", async () => {
    mockLimiter.consume.mockRejectedValue(new Error("Redis is down"));

    await expect(call({}, false, { remoteAddress: "1.2.3.4" })).resolves.toBe(
      true,
    );
  });

  it("skips entirely when DISABLE_RATE_LIMIT=true", async () => {
    process.env.DISABLE_RATE_LIMIT = "true";

    await expect(call({})).resolves.toBe(true);
    expect(mockLimiter.consume).not.toHaveBeenCalled();
  });

  it("skips routes marked @SkipRateLimit()", async () => {
    await expect(call({}, true)).resolves.toBe(true);
    expect(mockLimiter.consume).not.toHaveBeenCalled();
  });
});
