import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import type { KanClient } from "../client.js";
import { registerWorkspaceTools } from "./workspace.js";

describe("list_workspaces", () => {
  it("unwraps GET /workspaces' membership shape, matching find_workspace_by_name's output", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi.fn().mockResolvedValueOnce([
      {
        role: "member",
        workspace: { publicId: "ws-000001", name: "Marketing" },
      },
      {
        role: "admin",
        workspace: { publicId: "ws-000002", name: "Engineering" },
      },
    ]);
    const client: KanClient = { request };

    registerWorkspaceTools(server, client);

    const result = (await tools.get("list_workspaces")?.({})) as {
      content: { text: string }[];
    };

    expect(JSON.parse(result.content[0]!.text)).toEqual([
      { publicId: "ws-000001", name: "Marketing" },
      { publicId: "ws-000002", name: "Engineering" },
    ]);
  });
});

describe("find_workspace_by_name", () => {
  it("resolves GET /workspaces' nested membership shape", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi.fn().mockResolvedValueOnce([
      {
        role: "member",
        workspace: { publicId: "ws-000001", name: "Marketing" },
      },
      {
        role: "admin",
        workspace: { publicId: "ws-000002", name: "Engineering" },
      },
    ]);
    const client: KanClient = { request };

    registerWorkspaceTools(server, client);

    const result = (await tools.get("find_workspace_by_name")?.({
      name: "engineering",
    })) as { content: { text: string }[] };

    expect(JSON.parse(result.content[0]!.text)).toEqual({
      publicId: "ws-000002",
      name: "Engineering",
    });
  });

  it("lists available workspace names when nothing matches", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi.fn().mockResolvedValueOnce([
      {
        role: "member",
        workspace: { publicId: "ws-000001", name: "Marketing" },
      },
    ]);
    const client: KanClient = { request };

    registerWorkspaceTools(server, client);

    const result = (await tools.get("find_workspace_by_name")?.({
      name: "Nonexistent",
    })) as { content: { text: string }[] };

    expect(result.content[0]!.text).toBe(
      'No workspace found with name "Nonexistent". Available workspaces: Marketing',
    );
  });
});

describe("check_workspace_slug_availability", () => {
  it("queries the backend's `workspaceSlug` param", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi
      .fn()
      .mockResolvedValueOnce({ isAvailable: true, isReserved: false });
    const client: KanClient = { request };

    registerWorkspaceTools(server, client);

    await tools.get("check_workspace_slug_availability")?.({
      slug: "my-new-workspace",
    });

    expect(request).toHaveBeenCalledWith(
      "GET",
      "/workspaces/check-slug-availability?workspaceSlug=my-new-workspace",
    );
  });
});
