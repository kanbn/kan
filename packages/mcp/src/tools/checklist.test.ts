import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import type { KanClient } from "../client.js";
import { registerChecklistTools } from "./checklist.js";

describe("update_checklist_item", () => {
  it("sends the completion flag as `completed` in the update payload", async () => {
    const tools = new Map<string, (...args: unknown[]) => unknown>();
    const server = {
      tool: (name: string, ...args: unknown[]) => {
        tools.set(name, args.at(-1) as (...args: unknown[]) => unknown);
      },
    } as unknown as McpServer;
    const request = vi
      .fn()
      .mockResolvedValueOnce({ publicId: "item-123456", completed: true });
    const client: KanClient = { request };

    registerChecklistTools(server, client);

    await tools.get("update_checklist_item")?.({
      checklistItemPublicId: "item-123456",
      isCompleted: true,
    });

    expect(request).toHaveBeenCalledWith(
      "PATCH",
      "/checklists/items/item-123456",
      {
        title: undefined,
        completed: true,
        index: undefined,
      },
    );
  });
});
