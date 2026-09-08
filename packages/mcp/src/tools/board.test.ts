import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import type { KanClient } from "../client.js";
import { registerBoardTools } from "./board.js";

describe("create_board", () => {
  it("forwards documented input with the backend-required empty arrays", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi.fn().mockResolvedValueOnce({ publicId: "board-123456" });
    const client: KanClient = { request };

    registerBoardTools(server, client);

    await tools.get("create_board")?.({
      workspacePublicId: "workspace-123456",
      name: "Private board",
      visibility: "private",
    });

    expect(request).toHaveBeenCalledWith(
      "POST",
      "/workspaces/workspace-123456/boards",
      {
        name: "Private board",
        slug: undefined,
        visibility: "private",
        lists: [],
        labels: [],
      },
    );
  });
});
