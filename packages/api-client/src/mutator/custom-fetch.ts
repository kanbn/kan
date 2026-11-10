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

  if (!response.ok || !isJson) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status, data });
  }

  return { status: response.status, data, headers: response.headers } as T;
};
