import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthController } from "../auth.controller.js";

const handler =
  vi.fn<(request: globalThis.Request) => Promise<globalThis.Response>>();

vi.mock("../../../common/session.util.js", () => ({
  auth: { handler: (request: globalThis.Request) => handler(request) },
  headersFromRaw: (raw: Record<string, string>) => new Headers(raw),
}));

const mockRes = () => ({ status: vi.fn(), setHeader: vi.fn(), send: vi.fn() });

beforeEach(() => vi.clearAllMocks());

describe("AuthController", () => {
  it("passes the raw body, cookies and path to better-auth", async () => {
    handler.mockResolvedValue(new Response("{}"));
    const body = Buffer.from('{"email":"a@b.co"}');

    await new AuthController().handle(
      {
        method: "POST",
        originalUrl: "/api/auth/sign-in/magic-link?x=1",
        headers: { host: "api:4000", cookie: "kan.session_token=abc" },
        rawBody: body,
      } as unknown as Request,
      mockRes() as unknown as Response,
    );

    const request = handler.mock.calls[0]![0];
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname + new URL(request.url).search).toBe(
      "/api/auth/sign-in/magic-link?x=1",
    );
    expect(request.headers.get("cookie")).toBe("kan.session_token=abc");
    expect(await request.text()).toBe('{"email":"a@b.co"}');
  });

  it("returns redirects with every set-cookie header intact", async () => {
    const headers = new Headers({ location: "/boards" });
    headers.append("set-cookie", "a=1; Path=/");
    headers.append("set-cookie", "b=2; Path=/");
    handler.mockResolvedValue(new Response(null, { status: 302, headers }));
    const res = mockRes();

    await new AuthController().handle(
      {
        method: "GET",
        originalUrl: "/api/auth/callback/github?code=x",
        headers: { host: "api:4000" },
      } as unknown as Request,
      res as unknown as Response,
    );

    expect(res.status).toHaveBeenCalledWith(302);
    expect(res.setHeader).toHaveBeenCalledWith("location", "/boards");
    expect(res.setHeader).toHaveBeenCalledWith("set-cookie", [
      "a=1; Path=/",
      "b=2; Path=/",
    ]);
  });
});
