import type { GetServerSidePropsContext } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSocialProvidersProps } from "./social-providers";

vi.mock("~/env", () => ({ env: { KAN_API_URL: "http://api:4000/" } }));
vi.mock("@kan/shared/env", () => ({ env: vi.fn() }));

const run = () =>
  getSocialProvidersProps({
    req: { headers: { "x-forwarded-for": "203.0.113.7" }, socket: {} },
  } as unknown as GetServerSidePropsContext);

afterEach(() => vi.restoreAllMocks());

describe("getSocialProvidersProps", () => {
  it("passes the configured providers to the page", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(["google"]));

    expect(await run()).toEqual({ props: { socialProviders: ["google"] } });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("http://api:4000/api/auth/social-providers");
    expect(init?.headers).toEqual({ "x-forwarded-for": "203.0.113.7" });
  });

  it("falls back when the API errors or can't be reached", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await run()).toEqual({ props: { socialProviders: null } });

    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect(await run()).toEqual({ props: { socialProviders: null } });
  });
});
