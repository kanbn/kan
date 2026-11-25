import { Writable } from "stream";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const appEnv = vi.hoisted(() => ({
  KAN_API_URL: undefined as string | undefined,
  NODE_ENV: "production",
}));
vi.mock("~/env", () => ({ env: appEnv }));
vi.mock("@kan/shared/env", () => ({ env: vi.fn() }));
vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));
vi.mock("@kan/server/utils/rateLimit", () => ({
  getClientIp: (_headers: unknown, remoteAddress: string) => remoteAddress,
}));

const { proxyToApi } = await import("./api-proxy");
const handler = (req: NextApiRequest, res: NextApiResponse) =>
  proxyToApi(req, res, "/workspaces?x=1");

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
  return { req, res: res as unknown as NextApiResponse, mocks: res };
}

describe("proxyToApi", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    appEnv.KAN_API_URL = "http://api:4000";
  });

  it("falls back to the API on localhost when no URL is configured", async () => {
    appEnv.KAN_API_URL = undefined;
    fetchMock.mockResolvedValue(new Response("{}"));
    const { req, res } = makeReqRes();
    await handler(req, res);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      /^http:\/\/localhost:4000\//,
    );
  });

  it("returns API_UNAVAILABLE 502 when the API can't be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { req, res, mocks } = makeReqRes();
    await handler(req, res);
    expect(mocks.status).toHaveBeenCalledWith(502);
    expect(mocks.json).toHaveBeenCalledWith(
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
    const { req, res, mocks } = makeReqRes();
    await handler(req, res);

    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(target).toBe("http://api:4000/workspaces?x=1");
    expect(headers.get("cookie")).toBe("session=abc");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(headers.get("host")).toBeNull();
    expect(mocks.status).toHaveBeenCalledWith(201);
    expect(mocks.setHeader).toHaveBeenCalledWith("retry-after", "5");
    expect(String(mocks.send.mock.calls[0]?.[0])).toBe('{"ok":true}');
  });

  it("streams events as they arrive and hangs up when the browser does", async () => {
    const onCancel = vi.fn();
    let send: (text: string) => void = () => undefined;
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start: (controller) => {
            send = (text) => controller.enqueue(new TextEncoder().encode(text));
          },
          cancel: onCancel,
        }),
        {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            "x-accel-buffering": "no",
          },
        },
      ),
    );
    const { req } = makeReqRes();
    const headers = new Map<string, string>();
    let text = "";
    const res = Object.assign(
      new Writable({
        write(chunk: Buffer, _encoding, callback) {
          text += chunk.toString();
          callback();
        },
      }),
      {
        status: vi.fn().mockReturnThis(),
        setHeader: (name: string, value: string) => headers.set(name, value),
        flushHeaders: vi.fn(),
        send: vi.fn(),
      },
    );
    const done = handler(req, res as unknown as NextApiResponse);

    await vi.waitFor(() => expect(res.flushHeaders).toHaveBeenCalled());
    send("data: 1\n\n");
    await vi.waitFor(() => expect(text).toBe("data: 1\n\n"));
    expect(headers.get("cache-control")).toContain("no-transform");
    expect(headers.get("x-accel-buffering")).toBe("no");

    res.destroy();
    await done;
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalled());
    expect(res.send).not.toHaveBeenCalled();
  });
});
