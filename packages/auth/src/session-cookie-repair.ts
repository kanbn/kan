import type { BetterAuthOptions } from "better-auth";
import { getCookies, parseCookies } from "better-auth/cookies";

type CookieOptions = ReturnType<typeof getCookies>["sessionToken"]["options"];

const serialize = (
  name: string,
  value: string,
  options: CookieOptions,
  maxAge: number,
  domain?: string,
) =>
  [
    `${name}=${value}`,
    `Path=${options.path ?? "/"}`,
    domain && `Domain=${domain}`,
    `Max-Age=${maxAge}`,
    options.secure && "Secure",
    options.httpOnly && "HttpOnly",
    options.sameSite && `SameSite=${options.sameSite}`,
  ]
    .filter(Boolean)
    .join("; ");

/**
 * Session cookies set before cross-subdomain cookies were enabled are scoped to
 * the web host only, so the API never sees them. With a valid session this
 * moves the cookies to the shared domain; otherwise it clears them so the
 * login page doesn't bounce the user back to a page that can't load.
 */
export const repairSessionCookies = (input: {
  options: BetterAuthOptions;
  cookieHeader: string | undefined;
  hasSession: boolean;
  alreadyRepaired: boolean;
}) => {
  const domain = input.options.advanced?.crossSubDomainCookies?.domain;
  const heal = input.hasSession && !!domain && !input.alreadyRepaired;
  const maxAge = input.options.session?.expiresIn ?? 60 * 60 * 24 * 7;
  const present = parseCookies(input.cookieHeader ?? "");

  const headers = Object.values(getCookies(input.options)).flatMap(
    ({ name, options }) => {
      const value = present.get(name);
      if (!value) return [];
      const hostOnly = serialize(name, "", options, 0);
      if (heal)
        return [hostOnly, serialize(name, value, options, maxAge, domain)];
      return domain
        ? [hostOnly, serialize(name, "", options, 0, domain)]
        : [hostOnly];
    },
  );

  return { healed: heal && headers.length > 0, headers };
};
