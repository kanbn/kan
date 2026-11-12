import type { BetterAuthOptions } from "better-auth";
import { getCookies } from "better-auth/cookies";
import { describe, expect, it } from "vitest";

import { repairSessionCookies } from "./session-cookie-repair";

const cloud: BetterAuthOptions = {
  baseURL: "https://kan.bn",
  session: { expiresIn: 2592000 },
  advanced: {
    cookiePrefix: "kan",
    crossSubDomainCookies: { enabled: true, domain: "kan.bn" },
    defaultCookieAttributes: { sameSite: "lax", secure: true },
  },
};
const selfHosted: BetterAuthOptions = {
  baseURL: "https://kan.example.com",
  advanced: { cookiePrefix: "kan" },
};

const session = getCookies(cloud).sessionToken.name;
const header = `${session}=token.signature; other=1`;

const repair = (
  overrides: Partial<Parameters<typeof repairSessionCookies>[0]> = {},
) =>
  repairSessionCookies({
    options: cloud,
    cookieHeader: header,
    hasSession: true,
    alreadyRepaired: false,
    ...overrides,
  });

describe("repairSessionCookies", () => {
  it("moves a valid host-only session cookie to the shared domain", () => {
    const { healed, headers } = repair();

    expect(healed).toBe(true);
    expect(headers).toHaveLength(2);
    expect(headers[0]).toMatch(new RegExp(`^${session}=; Path=/; Max-Age=0`));
    expect(headers[0]).not.toContain("Domain=");
    expect(headers[1]).toMatch(
      new RegExp(
        `^${session}=token.signature; Path=/; Domain=kan.bn; Max-Age=2592000`,
      ),
    );
  });

  it("clears both cookies when the session isn't valid", () => {
    const { healed, headers } = repair({ hasSession: false });

    expect(healed).toBe(false);
    expect(headers).toEqual([
      expect.stringMatching(/Max-Age=0/),
      expect.stringMatching(/Domain=kan\.bn; Max-Age=0/),
    ]);
    expect(headers[0]).not.toContain("Domain=");
  });

  it("clears instead of repairing a second time, so it can't loop", () => {
    expect(repair({ alreadyRepaired: true }).healed).toBe(false);
  });

  it("only clears the host cookie when no shared domain is configured", () => {
    const name = getCookies(selfHosted).sessionToken.name;
    const { healed, headers } = repair({
      options: selfHosted,
      cookieHeader: `${name}=token.signature`,
    });

    expect(healed).toBe(false);
    expect(headers).toEqual([expect.stringMatching(/Max-Age=0/)]);
    expect(headers[0]).not.toContain("Domain=");
  });

  it("does nothing without session cookies", () => {
    expect(repair({ cookieHeader: "other=1" })).toEqual({
      healed: false,
      headers: [],
    });
  });
});
