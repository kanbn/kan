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

describe("find_board_by_name", () => {
  it("resolves the workspace from GET /workspaces' nested membership shape", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi
      .fn()
      .mockResolvedValueOnce([
        { role: "admin", workspace: { publicId: "ws-123456", name: "Eng" } },
      ])
      .mockResolvedValueOnce([{ publicId: "board-123456", name: "Roadmap" }]);
    const client: KanClient = { request };

    registerBoardTools(server, client);

    const result = (await tools.get("find_board_by_name")?.({
      workspaceName: "eng",
      boardName: "roadmap",
    })) as { content: { text: string }[] };

    expect(request).toHaveBeenNthCalledWith(1, "GET", "/workspaces");
    expect(request).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/workspaces/ws-123456/boards",
    );
    expect(JSON.parse(result.content[0]!.text)).toEqual({
      publicId: "board-123456",
      name: "Roadmap",
    });
  });
});

describe("update_board", () => {
  it("sends the favorite flag as `favorite` in the update payload", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi.fn().mockResolvedValueOnce({ publicId: "board-123456" });
    const client: KanClient = { request };

    registerBoardTools(server, client);

    await tools.get("update_board")?.({
      boardPublicId: "board-123456",
      isFavorite: true,
    });

    expect(request).toHaveBeenCalledWith("PUT", "/boards/board-123456", {
      name: undefined,
      slug: undefined,
      visibility: undefined,
      favorite: true,
    });
  });
});
