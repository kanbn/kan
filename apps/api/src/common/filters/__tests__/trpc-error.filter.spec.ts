import type { ArgumentsHost } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { TrpcErrorFilter } from "../trpc-error.filter.js";

function call(exception: TRPCError) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new TrpcErrorFilter().catch(exception, host);

  return { status, json };
}

describe("TrpcErrorFilter", () => {
  it("maps FORBIDDEN to a 403 response", () => {
    const { status, json } = call(
      new TRPCError({ code: "FORBIDDEN", message: "nope" }),
    );

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ statusCode: 403, message: "nope" });
  });

  it("maps NOT_FOUND to a 404 response", () => {
    const { status } = call(
      new TRPCError({ code: "NOT_FOUND", message: "missing" }),
    );

    expect(status).toHaveBeenCalledWith(404);
  });

  it("falls back to 500 for unmapped codes", () => {
    const { status } = call(
      new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom" }),
    );

    expect(status).toHaveBeenCalledWith(500);
  });
});
