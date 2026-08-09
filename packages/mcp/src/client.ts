export interface KanConfig {
  baseUrl: string;
  apiToken: string;
}

function getConfig(): KanConfig {
  const baseUrl = process.env["KAN_BASE_URL"];
  const apiToken = process.env["KAN_API_TOKEN"];

  if (!baseUrl) {
    throw new Error("KAN_BASE_URL environment variable is required");
  }
  if (!apiToken) {
    throw new Error("KAN_API_TOKEN environment variable is required");
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiToken,
  };
}

export class KanApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`Kan API error ${status} ${statusText}: ${JSON.stringify(body)}`);
    this.name = "KanApiError";
  }
}

export async function kanRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const config = getConfig();
  const url = `${config.baseUrl}/api/v1${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    throw new KanApiError(res.status, res.statusText, data);
  }

  return data as T;
}
