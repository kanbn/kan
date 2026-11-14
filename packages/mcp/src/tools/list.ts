import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { KanClient } from "../client.js";

export function registerListTools(server: McpServer, client: KanClient): void {
  server.registerTool(
    "create_list",
    {
      description: "Create a new list inside a board",
      inputSchema: z.object({
        boardPublicId: z.string().describe("The board's public ID"),
        name: z.string().describe("List name"),
      }),
    },
    async ({ boardPublicId, name }) => {
      const data = await client.request("POST", "/lists", {
        boardPublicId,
        name,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_list",
    {
      description: "Update a list's name or position",
      inputSchema: z.object({
        listPublicId: z.string().describe("The list's public ID"),
        name: z.string().optional().describe("New list name"),
        index: z.number().int().optional().describe("New position index"),
      }),
    },
    async ({ listPublicId, name, index }) => {
      const data = await client.request("PUT", `/lists/${listPublicId}`, {
        name,
        index,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_list",
    {
      description: "Delete a list and all its cards",
      inputSchema: z.object({
        listPublicId: z.string().describe("The list's public ID"),
      }),
    },
    async ({ listPublicId }) => {
      const data = await client.request("DELETE", `/lists/${listPublicId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
