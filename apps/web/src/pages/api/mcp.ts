import type { NextApiRequest, NextApiResponse } from "next";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env } from "next-runtime-env";

import type { KanClient } from "@kan/mcp/client";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { createKanMcpServer } from "@kan/mcp";
import { createKanClient, KanApiError } from "@kan/mcp/client";
import { isPaidWorkspacePlan } from "@kan/shared/utils";

interface WorkspaceMembership {
  workspace: { plan: string };
}

function getApiToken(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  const bearerMatch = authorization?.match(/^Bearer (.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1] ?? null;
  }
  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string") {
    return apiKeyHeader;
  }
  return null;
}

async function hasPaidWorkspace(client: KanClient): Promise<boolean> {
  const memberships = await client.request<WorkspaceMembership[]>(
    "GET",
    "/workspaces",
  );
  return memberships.some((m) => isPaidWorkspacePlan(m.workspace.plan));
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const rawBaseUrl = env("NEXT_PUBLIC_BASE_URL");
  if (!rawBaseUrl) {
    res.status(500).json({ error: "NEXT_PUBLIC_BASE_URL is not configured" });
    return;
  }
  const baseUrl = rawBaseUrl.replace(/\/$/, "");

  const client = createKanClient({ baseUrl, apiToken });

  if (env("NEXT_PUBLIC_KAN_ENV") === "cloud") {
    let eligible: boolean;
    try {
      eligible = await hasPaidWorkspace(client);
    } catch (error) {
      if (error instanceof KanApiError && error.status === 401) {
        res.status(401).json({ error: "Invalid API key" });
        return;
      }
      throw error;
    }
    if (!eligible) {
      res.status(403).json({
        error:
          "The hosted MCP server requires a Team, Pro, or Enterprise workspace plan.",
      });
      return;
    }
  }

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

export default withApiLogging(handler, { transport: "mcp" });

export const config = {
  api: {
    bodyParser: false,
  },
};
