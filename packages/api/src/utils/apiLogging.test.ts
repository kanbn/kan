import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it, vi } from "vitest";

const createNextApiContext = vi.fn().mockRejectedValue(new Error("no auth"));
vi.mock("../trpc-context", () => ({
  createNextApiContext: (req: NextApiRequest) => createNextApiContext(req),
}));

const info = vi.fn();
const error = vi.fn();
vi.mock("@kan/logger", () => ({
  createLogger: vi.fn(() => ({ info, error })),
}));

const { withApiLogging } = await import("./apiLogging.js");

function makeReqRes() {
  const req = {
    url: "/api/example",
    headers: {},
  } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    headersSent: false,
    status(this: NextApiResponse, code: number) {
      (this as unknown as { statusCode: number }).statusCode = code;
      return this;
    },
    json: vi.fn(),
  } as unknown as NextApiResponse;
  return { req, res };
}

describe("withApiLogging", () => {
  it('defaults transport to "rest" when no options are given', async () => {
    info.mockClear();
    const { req, res } = makeReqRes();
    const handler = withApiLogging(async (_req, res) => {
      res.status(200).json({ ok: true });
    });

    await handler(req, res);

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ transport: "rest" }),
      "API OK",
    );
  });

  it("uses the given transport label", async () => {
    info.mockClear();
    const { req, res } = makeReqRes();
    const handler = withApiLogging(
      async (_req, res) => {
        res.status(200).json({ ok: true });
      },
      { transport: "mcp" },
    );

    await handler(req, res);

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({ transport: "mcp" }),
      "API OK",
    );
  });

  it("logs as an error when statusCode is set directly, without going through status()", async () => {
    error.mockClear();
    const { req, res } = makeReqRes();
    const handler = withApiLogging(async (_req, res) => {
      (res as unknown as { statusCode: number }).statusCode = 406;
    });

    await handler(req, res);

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 406 }),
      "API error",
    );
  });

  it("logs as an error when the handler throws after headers were already sent", async () => {
    error.mockClear();
    const { req, res } = makeReqRes();
    (res as unknown as { headersSent: boolean }).headersSent = true;
    (res as unknown as { statusCode: number }).statusCode = 200;
    const handler = withApiLogging(async () => {
      throw new Error("boom");
    });

    await handler(req, res);

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, error: "boom" }),
      "API error",
    );
  });

  it("redacts secrets in the logged body and query", async () => {
    info.mockClear();
    const { req, res } = makeReqRes();
    Object.assign(req, {
      query: { code: "oauth-code", page: "2" },
      body: { token: "trello-token", name: "Board" },
    });
    const handler = withApiLogging((_req, res) => {
      res.status(200).json({ ok: true });
    });

    await handler(req, res);

    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          query: { code: "[REDACTED]", page: "2" },
          body: { token: "[REDACTED]", name: "Board" },
        },
      }),
      "API OK",
    );
  });

  it("passes the original token to the handler", async () => {
    const { req, res } = makeReqRes();
    Object.assign(req, { body: { token: "trello-token" } });
    let received: unknown;
    const handler = withApiLogging((req, res) => {
      received = (req.body as { token: string }).token;
      res.status(200).json({ ok: true });
    });

    await handler(req, res);

    expect(received).toBe("trello-token");
  });

  it("looks up the session for every transport, including mcp", async () => {
    createNextApiContext.mockClear();
    const { req, res } = makeReqRes();
    const handler = withApiLogging(
      async (_req, res) => {
        res.status(200).json({ ok: true });
      },
      { transport: "mcp" },
    );

    await handler(req, res);

    expect(createNextApiContext).toHaveBeenCalledWith(req);
  });
});
