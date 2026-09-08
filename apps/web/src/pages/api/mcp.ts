import type { NextApiRequest, NextApiResponse } from "next";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env } from "next-runtime-env";

import { createKanMcpServer } from "@kan/mcp";
import { createKanClient } from "@kan/mcp/client";

function getApiToken(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiToken = getApiToken(req);
  if (!apiToken) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="kan"');
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  const baseUrl = env("NEXT_PUBLIC_BASE_URL");
  if (!baseUrl) {
    res.status(500).json({ error: "NEXT_PUBLIC_BASE_URL is not configured" });
    return;
  }

  const client = createKanClient({ baseUrl, apiToken });
  const server = createKanMcpServer(client);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
