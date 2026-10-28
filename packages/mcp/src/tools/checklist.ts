import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { KanClient } from "../client.js";

export function registerChecklistTools(
  server: McpServer,
  client: KanClient,
): void {
  server.tool(
    "create_checklist",
    "Add a checklist to a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      name: z.string().describe("Checklist name"),
    },
    async ({ cardPublicId, name }) => {
      const data = await client.request(
        "POST",
        `/cards/${cardPublicId}/checklists`,
        { name },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "update_checklist",
    "Rename a checklist",
    {
      checklistPublicId: z.string().describe("The checklist's public ID"),
      name: z.string().describe("New checklist name"),
    },
    async ({ checklistPublicId, name }) => {
      const data = await client.request(
        "PUT",
        `/checklists/${checklistPublicId}`,
        { name },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_checklist",
    "Delete a checklist and all its items",
    { checklistPublicId: z.string().describe("The checklist's public ID") },
    async ({ checklistPublicId }) => {
      const data = await client.request(
        "DELETE",
        `/checklists/${checklistPublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "create_checklist_item",
    "Add an item to a checklist",
    {
      checklistPublicId: z.string().describe("The checklist's public ID"),
      title: z.string().describe("Item title"),
    },
    async ({ checklistPublicId, title }) => {
      const data = await client.request(
        "POST",
        `/checklists/${checklistPublicId}/items`,
        { title },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "update_checklist_item",
    "Update a checklist item's title, completion status, or position",
    {
      checklistItemPublicId: z
        .string()
        .describe("The checklist item's public ID"),
      title: z.string().optional().describe("New item title"),
      isCompleted: z
        .boolean()
        .optional()
        .describe("Mark item as completed or not"),
      index: z.number().int().optional().describe("New position index"),
    },
    async ({ checklistItemPublicId, title, isCompleted, index }) => {
      const data = await client.request(
        "PATCH",
        `/checklists/items/${checklistItemPublicId}`,
        {
          title,
          completed: isCompleted,
          index,
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_checklist_item",
    "Delete a checklist item",
    {
      checklistItemPublicId: z
        .string()
        .describe("The checklist item's public ID"),
    },
    async ({ checklistItemPublicId }) => {
      const data = await client.request(
        "DELETE",
        `/checklists/items/${checklistItemPublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
