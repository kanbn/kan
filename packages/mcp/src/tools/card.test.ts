import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import type { KanClient } from "../client.js";
import { registerCardTools } from "./card.js";

describe("duplicate_card", () => {
  it("sends the backend's expected `listPublicId` field when a target list is given", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-999999" });
    const client: KanClient = { request };

    registerCardTools(server, client);

    await tools.get("duplicate_card")?.({
      cardPublicId: "card-123456",
      targetListPublicId: "list-654321",
    });

    expect(request).toHaveBeenCalledWith(
      "POST",
      "/cards/card-123456/duplicate",
      {
        listPublicId: "list-654321",
        copyLabels: true,
        copyMembers: true,
        copyChecklists: true,
      },
    );
  });

  it("looks up the card's current list when no target list is given", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi
      .fn()
      .mockResolvedValueOnce({ list: { publicId: "list-111111" } })
      .mockResolvedValueOnce({ publicId: "card-999999" });
    const client: KanClient = { request };

    registerCardTools(server, client);

    await tools.get("duplicate_card")?.({
      cardPublicId: "card-123456",
    });

    expect(request).toHaveBeenNthCalledWith(1, "GET", "/cards/card-123456");
    expect(request).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/cards/card-123456/duplicate",
      {
        listPublicId: "list-111111",
        copyLabels: true,
        copyMembers: true,
        copyChecklists: true,
      },
    );
  });
});
