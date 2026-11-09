import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { resolveUserFromHeaders } from "../../session.util.js";
import { AuthGuard } from "../auth.guard.js";

vi.mock("../../session.util.js", () => ({
  headersFromRaw: () => new Headers(),
  resolveUserFromHeaders: vi.fn(),
}));

function call(headers: Record<string, string>) {
  const request: Record<string, unknown> = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, result: new AuthGuard().canActivate(context) };
}

describe("AuthGuard", () => {
  it("attaches the user and allows the request when a session resolves", async () => {
    const user = { id: "user_1", email: "henry@kan.bn" };
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({ user } as never);

    const { request, result } = call({ cookie: "session=abc" });

    await expect(result).resolves.toBe(true);
    expect(request.user).toBe(user);
  });

  it("rejects the request when there's no session", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({ user: null });

    await expect(call({}).result).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
