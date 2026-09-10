import type { NextApiRequest, NextApiResponse } from "next";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env } from "next-runtime-env";

import type { KanClient } from "@kan/mcp/client";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { getApiToken } from "@kan/api/utils/apiToken";
import {
  getCachedPaidWorkspaceEligibility,
  setCachedPaidWorkspaceEligibility,
} from "@kan/api/utils/paidWorkspaceCache";
import { createKanMcpServer } from "@kan/mcp";
import { createKanClient, KanApiError } from "@kan/mcp/client";
import { isPaidWorkspacePlan } from "@kan/shared/utils";

interface WorkspaceMembership {
  workspace: { plan: string };
}

async function hasPaidWorkspace(
  client: KanClient,
  apiToken: string,
): Promise<boolean> {
  if (await getCachedPaidWorkspaceEligibility(apiToken)) {
    return true;
  }

  const memberships = await client.request<WorkspaceMembership[]>(
    "GET",
    "/workspaces",
  );
  const eligible = memberships.some((m) =>
    isPaidWorkspacePlan(m.workspace.plan),
  );

  if (eligible) {
    await setCachedPaidWorkspaceEligibility(apiToken);
  }

  return eligible;
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
      eligible = await hasPaidWorkspace(client, apiToken);
    } catch (error) {
      if (error instanceof KanApiError && error.status === 401) {
        res.status(401).json({ error: "Invalid API key" });
        return;
      }
      if (error instanceof KanApiError && error.status === 429) {
        res.status(429).json({ error: error.message });
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
    enableJsonResponse: true,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

export default withApiLogging(handler, { transport: "mcp" });
