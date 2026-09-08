import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it, vi } from "vitest";

vi.mock("../trpc-context", () => ({
  createNextApiContext: vi.fn().mockRejectedValue(new Error("no auth")),
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
  const statusSpy = vi.fn().mockReturnThis();
  const res = {
    status: statusSpy,
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
});
