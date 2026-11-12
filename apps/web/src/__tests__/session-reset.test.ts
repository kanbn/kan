import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { repairSessionCookies } from "@kan/auth/server";
import { createNextApiContext } from "@kan/server/context";

import handler from "../pages/api/session/reset";

vi.mock("@kan/server/context", () => ({
  auth: { options: {} },
  createNextApiContext: vi.fn(),
}));
vi.mock("@kan/auth/server", () => ({ repairSessionCookies: vi.fn() }));
vi.mock("@kan/logger", () => ({
  createLogger: () => ({ info: vi.fn() }),
}));

const call = async (query: Record<string, string>, cookies = {}) => {
  const res = {
    setHeader: vi.fn(),
    redirect: vi.fn(),
  };
  await handler(
    { query, cookies, headers: { cookie: "a=b" } } as unknown as NextApiRequest,
    res as unknown as NextApiResponse,
  );
  return res;
};

beforeEach(() => {
  vi.mocked(createNextApiContext).mockResolvedValue({
    user: { id: "user_1" },
  } as never);
});

describe("GET /api/session/reset", () => {
  it("returns to the page after repairing the session", async () => {
    vi.mocked(repairSessionCookies).mockReturnValue({
      healed: true,
      headers: ["kan.session_token=x"],
    });

    const res = await call({ next: "/boards/abc?view=list" });

    expect(res.setHeader).toHaveBeenCalledWith("Set-Cookie", [
      "kan.session_token=x",
      expect.stringContaining("kan_session_repair=1"),
    ]);
    expect(res.redirect).toHaveBeenCalledWith(302, "/boards/abc?view=list");
  });

  it("signs in again when the session can't be repaired", async () => {
    vi.mocked(repairSessionCookies).mockReturnValue({
      healed: false,
      headers: [],
    });

    const res = await call({ next: "/boards" }, { kan_session_repair: "1" });

    expect(repairSessionCookies).toHaveBeenLastCalledWith(
      expect.objectContaining({ alreadyRepaired: true }),
    );
    expect(res.redirect).toHaveBeenCalledWith(302, "/login");
  });

  it("only returns to paths on this site", async () => {
    vi.mocked(repairSessionCookies).mockReturnValue({
      healed: true,
      headers: [],
    });

    for (const next of ["//evil.example", "https://evil.example", "/\\evil"]) {
      const res = await call({ next });
      expect(res.redirect).toHaveBeenCalledWith(302, "/boards");
    }
  });
});
