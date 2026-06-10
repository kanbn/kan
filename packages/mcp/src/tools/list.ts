import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

export function registerListTools(server: McpServer): void {
  server.tool(
    "create_list",
    "Create a new list inside a board",
    {
      boardPublicId: z.string().describe("The board's public ID"),
      name: z.string().describe("List name"),
    },
    async ({ boardPublicId, name }) => {
      const data = await kanRequest("POST", "/lists", { boardPublicId, name });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_list",
    "Update a list's name or position",
    {
      listPublicId: z.string().describe("The list's public ID"),
      name: z.string().optional().describe("New list name"),
      index: z.number().int().optional().describe("New position index"),
    },
    async ({ listPublicId, name, index }) => {
      const data = await kanRequest("PUT", `/lists/${listPublicId}`, { name, index });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_list",
    "Delete a list and all its cards",
    { listPublicId: z.string().describe("The list's public ID") },
    async ({ listPublicId }) => {
      const data = await kanRequest("DELETE", `/lists/${listPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
