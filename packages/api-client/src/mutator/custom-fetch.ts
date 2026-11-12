import { env } from "next-runtime-env";

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const baseUrl = env("NEXT_PUBLIC_API_BASE_URL") ?? "";
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    credentials: "include",
  });
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const data = isJson
    ? await response.json().catch(() => undefined)
    : undefined;

  // A lapsed or cleared session goes through /api/session/reset, which repairs
  // a session the API can't see or signs the user out, then on to sign in.
  const { location } = globalThis as {
    location?: { pathname: string; search: string; href: string };
  };
  if (
    response.status === 401 &&
    location &&
    !location.pathname.startsWith("/login")
  ) {
    location.href = `/api/session/reset?next=${encodeURIComponent(location.pathname + location.search)}`;
  }

  if (!response.ok || !isJson) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status, data });
  }

  return { status: response.status, data, headers: response.headers } as T;
};
