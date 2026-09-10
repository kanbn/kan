import type { NextApiRequest, NextApiResponse } from "next";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { describe, expect, it, vi } from "vitest";

import { createTRPCRateLimitResponder } from "./trpcRateLimit";

const t = initTRPC.create({ transformer: superjson });
const router = t.router({});

interface RateLimitErrorResponse {
  error: {
    json: {
      message: string;
      code: number;
      data: {
        code: string;
        httpStatus: number;
        path: string;
      };
    };
  };
}

const createResponse = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({
    json,
  })) as unknown as NextApiResponse["status"];

  return {
    response: { status } as unknown as NextApiResponse,
    status,
    json,
  };
};

describe("createTRPCRateLimitResponder", () => {
  it("returns a transformed tRPC error for a single request", () => {
    const req = {
      query: { trpc: "board.byId" },
    } as unknown as NextApiRequest;
    const { response, status, json } = createResponse();

    createTRPCRateLimitResponder(router._def._config)(
      req,
      response,
      "Slow down",
    );

    expect(status).toHaveBeenCalledWith(429);
    const body = json.mock.calls[0]?.[0] as RateLimitErrorResponse;
    expect(body.error.json.message).toBe("Slow down");
    expect(body.error.json.code).toBe(-32029);
    expect(body.error.json.data).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      httpStatus: 429,
      path: "board.byId",
    });
  });

  it("returns one error per operation in a batch request", () => {
    const req = {
      query: { trpc: "board.byId,card.byId", batch: "1" },
    } as unknown as NextApiRequest;
    const { response, json } = createResponse();

    createTRPCRateLimitResponder(router._def._config)(
      req,
      response,
      "Slow down",
    );

    const body = json.mock.calls[0]?.[0] as RateLimitErrorResponse[];
    expect(body).toHaveLength(2);
    expect(body.map((item) => item.error.json.data.path)).toEqual([
      "board.byId",
      "card.byId",
    ]);
  });
});
