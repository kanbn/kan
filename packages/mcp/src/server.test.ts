import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KanClient } from "./client.js";
import { createKanMcpServer } from "./server.js";

describe("createKanMcpServer over Streamable HTTP", () => {
  let httpServer: ReturnType<typeof createServer>;
  let baseUrl: URL;
  const request = vi.fn();
  const client: KanClient = { request };

  beforeEach(async () => {
    request.mockReset();

    httpServer = createServer((req, res) => {
      const mcpServer = createKanMcpServer(client);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => {
        void transport.close();
        void mcpServer.close();
      });
      void mcpServer
        .connect(transport)
        .then(() => transport.handleRequest(req, res));
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", resolve);
    });
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = new URL(`http://127.0.0.1:${port}/mcp`);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it("lists tools and forwards a tool call through to the injected client", async () => {
    request.mockResolvedValueOnce([
      { publicId: "board-123456", name: "Roadmap" },
    ]);

    const mcpClient = new Client({ name: "test-client", version: "0.0.0" });
    const clientTransport = new StreamableHTTPClientTransport(baseUrl);
    await mcpClient.connect(clientTransport);

    const { tools } = await mcpClient.listTools();
    expect(tools.map((t) => t.name)).toContain("list_boards");

    const result = await mcpClient.callTool({
      name: "list_boards",
      arguments: { workspacePublicId: "workspace-123456" },
    });

    expect(request).toHaveBeenCalledWith(
      "GET",
      "/workspaces/workspace-123456/boards",
    );
    const [content] = result.content as { type: string; text: string }[];
    expect(content?.text).toContain("Roadmap");

    await mcpClient.close();
  });
});
