import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-runtime-env", () => ({
  env: vi.fn(),
}));

vi.mock("@kan/api/trpc-context", () => ({
  createNextApiContext: vi
    .fn()
    .mockRejectedValue(new Error("no auth in tests")),
}));
vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

const request = vi.fn();
vi.mock("@kan/mcp/client", () => ({
  createKanClient: vi.fn(() => ({ request })),
  KanApiError: class KanApiError extends Error {
    constructor(
      public status: number,
      public statusText: string,
      public body: unknown,
    ) {
      super("Kan API error");
    }
  },
}));

const connect = vi.fn().mockResolvedValue(undefined);
const close = vi.fn().mockResolvedValue(undefined);
vi.mock("@kan/mcp", () => ({
  createKanMcpServer: vi.fn(() => ({ connect, close })),
}));

const handleRequest = vi.fn().mockResolvedValue(undefined);
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn(() => ({
    close: vi.fn().mockResolvedValue(undefined),
    handleRequest,
  })),
}));

const { env } = await import("next-runtime-env");
const mockedEnv = vi.mocked(env);
const { createKanClient } = await import("@kan/mcp/client");
const mockedCreateKanClient = vi.mocked(createKanClient);
const handler = (await import("../pages/api/mcp.js")).default;

function makeReqRes(headers: Record<string, string> = {}) {
  const req = {
    method: "POST",
    headers: { authorization: "Bearer kan_test_token", ...headers },
  } as unknown as NextApiRequest;
  const statusSpy = vi.fn().mockReturnThis();
  const res = {
    setHeader: vi.fn(),
    status: statusSpy,
    json: vi.fn(),
    on: vi.fn(),
  } as unknown as NextApiResponse;
  return { req, res, statusSpy };
}

describe("POST /api/mcp", () => {
  beforeEach(() => {
    request.mockReset();
    connect.mockClear();
    handleRequest.mockClear();
    mockedCreateKanClient.mockClear();
    mockedEnv.mockReset();
    mockedEnv.mockImplementation((key: string) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.bn";
      return undefined;
    });
  });

  it("rejects a free-plan-only workspace on Kan Cloud with 403", async () => {
    mockedEnv.mockImplementation((key: string) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.bn";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "cloud";
      return undefined;
    });
    request.mockResolvedValueOnce([{ workspace: { plan: "free" } }]);

    const { req, res, statusSpy } = makeReqRes();
    await handler(req, res);

    expect(statusSpy).toHaveBeenCalledWith(403);
    expect(connect).not.toHaveBeenCalled();
  });

  it("allows a team-plan workspace on Kan Cloud through", async () => {
    mockedEnv.mockImplementation((key: string) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.bn";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "cloud";
      return undefined;
    });
    request.mockResolvedValueOnce([
      { workspace: { plan: "free" } },
      { workspace: { plan: "team" } },
    ]);

    const { req, res, statusSpy } = makeReqRes();
    await handler(req, res);

    expect(statusSpy).not.toHaveBeenCalledWith(403);
    expect(connect).toHaveBeenCalled();
  });

  it("does not gate self-hosted instances even on the free plan", async () => {
    mockedEnv.mockImplementation((key: string) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.example.com";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "self-hosted";
      return undefined;
    });

    const { req, res, statusSpy } = makeReqRes();
    await handler(req, res);

    expect(request).not.toHaveBeenCalled();
    expect(statusSpy).not.toHaveBeenCalledWith(403);
    expect(connect).toHaveBeenCalled();
  });

  it("strips a trailing slash from NEXT_PUBLIC_BASE_URL", async () => {
    mockedEnv.mockImplementation((key: string) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.bn/";
      return undefined;
    });

    const { req, res } = makeReqRes();
    await handler(req, res);

    expect(mockedCreateKanClient).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "https://kan.bn" }),
    );
  });

  it("returns a clean 500 instead of throwing when the plan check fails unexpectedly", async () => {
    mockedEnv.mockImplementation((key: string) => {
      if (key === "NEXT_PUBLIC_BASE_URL") return "https://kan.bn";
      if (key === "NEXT_PUBLIC_KAN_ENV") return "cloud";
      return undefined;
    });
    request.mockRejectedValueOnce(new TypeError("fetch failed"));

    const { req, res, statusSpy } = makeReqRes();
    await expect(handler(req, res)).resolves.not.toThrow();

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(connect).not.toHaveBeenCalled();
  });
});
