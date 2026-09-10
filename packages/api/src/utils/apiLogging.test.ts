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
