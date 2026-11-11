import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const appEnv = vi.hoisted(() => ({
  KAN_API_URL: undefined as string | undefined,
  NODE_ENV: "production",
}));
vi.mock("~/env", () => ({ env: appEnv }));
vi.mock("next-runtime-env", () => ({ env: vi.fn() }));
vi.mock("nextjs-cors", () => ({ default: vi.fn() }));
vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));
vi.mock("@kan/api/utils/rateLimit", () => ({
  tokenOrIpIdentifier: vi.fn(),
  withRateLimit: (_options: unknown, handler: unknown) => handler,
}));

const handler = (await import("../pages/api/v1/[...path].js")).default;

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeReqRes() {
  const req = {
    method: "GET",
    url: "/api/v1/workspaces?x=1",
    headers: { cookie: "session=abc", host: "kan.example" },
    socket: { remoteAddress: "203.0.113.7" },
  } as unknown as NextApiRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
  return { req, res: res as unknown as NextApiResponse & typeof res };
}

describe("/api/v1 proxy", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    appEnv.KAN_API_URL = "http://api:4000";
  });

  it("returns API_UNAVAILABLE 503 when no API URL is configured", async () => {
    appEnv.KAN_API_URL = undefined;
    const { req, res } = makeReqRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "API_UNAVAILABLE" }),
    );
  });

  it("returns API_UNAVAILABLE 502 when the API can't be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { req, res } = makeReqRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "API_UNAVAILABLE" }),
    );
  });

  it("forwards the request and passes the response through", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"ok":true}', {
        status: 201,
        headers: { "content-type": "application/json", "retry-after": "5" },
      }),
    );
    const { req, res } = makeReqRes();
    await handler(req, res);

    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(target).toBe("http://api:4000/workspaces?x=1");
    expect(headers.get("cookie")).toBe("session=abc");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get("host")).toBeNull();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.setHeader).toHaveBeenCalledWith("retry-after", "5");
    expect(String(res.send.mock.calls[0]?.[0])).toBe('{"ok":true}');
  });
});
