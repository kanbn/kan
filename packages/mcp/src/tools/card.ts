import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

export function registerCardTools(server: McpServer): void {
  server.tool(
    "create_card",
    "Create a new card in a list",
    {
      listPublicId: z.string().describe("The list's public ID"),
      title: z.string().describe("Card title"),
      description: z.string().optional().describe("Card description (markdown supported)"),
      dueDate: z.string().optional().describe("Due date in ISO 8601 format"),
      labelPublicIds: z
        .array(z.string())
        .optional()
        .describe("Public IDs of labels to attach"),
      memberPublicIds: z
        .array(z.string())
        .optional()
        .describe("Public IDs of workspace members to assign"),
    },
    async ({ listPublicId, title, description, dueDate, labelPublicIds, memberPublicIds }) => {
      const data = await kanRequest("POST", "/cards", {
        listPublicId,
        title,
        description,
        dueDate,
        labelPublicIds,
        memberPublicIds,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "get_card",
    "Get full details of a card including comments, checklists, labels and members",
    { cardPublicId: z.string().describe("The card's public ID") },
    async ({ cardPublicId }) => {
      const data = await kanRequest("GET", `/cards/${cardPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_card",
    "Update a card's title, description, due date, or move it to another list",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      title: z.string().optional().describe("New card title"),
      description: z.string().optional().describe("New description"),
      dueDate: z.string().nullable().optional().describe("Due date in ISO 8601, or null to clear"),
      listPublicId: z.string().optional().describe("Move card to this list (public ID)"),
    },
    async ({ cardPublicId, title, description, dueDate, listPublicId }) => {
      const data = await kanRequest("PUT", `/cards/${cardPublicId}`, {
        title,
        description,
        dueDate,
        listPublicId,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_card",
    "Delete a card (soft delete)",
    { cardPublicId: z.string().describe("The card's public ID") },
    async ({ cardPublicId }) => {
      const data = await kanRequest("DELETE", `/cards/${cardPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "duplicate_card",
    "Duplicate a card to the same or a different list",
    {
      cardPublicId: z.string().describe("The card's public ID to duplicate"),
      targetListPublicId: z
        .string()
        .optional()
        .describe("Target list public ID (defaults to same list)"),
    },
    async ({ cardPublicId, targetListPublicId }) => {
      const data = await kanRequest("POST", `/cards/${cardPublicId}/duplicate`, {
        targetListPublicId,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "get_card_activities",
    "Get the activity history of a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      cursor: z.string().optional().describe("Pagination cursor from a previous response"),
    },
    async ({ cardPublicId, cursor }) => {
      const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const data = await kanRequest("GET", `/cards/${cardPublicId}/activities${params}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "add_card_comment",
    "Add a comment to a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      content: z.string().describe("Comment text"),
    },
    async ({ cardPublicId, content }) => {
      const data = await kanRequest("POST", `/cards/${cardPublicId}/comments`, { content });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_card_comment",
    "Update the text of an existing comment",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      commentPublicId: z.string().describe("The comment's public ID"),
      content: z.string().describe("New comment text"),
    },
    async ({ cardPublicId, commentPublicId, content }) => {
      const data = await kanRequest(
        "PUT",
        `/cards/${cardPublicId}/comments/${commentPublicId}`,
        { content },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_card_comment",
    "Delete a comment from a card",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      commentPublicId: z.string().describe("The comment's public ID"),
    },
    async ({ cardPublicId, commentPublicId }) => {
      const data = await kanRequest(
        "DELETE",
        `/cards/${cardPublicId}/comments/${commentPublicId}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "toggle_card_label",
    "Add or remove a label on a card (toggles if already present)",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      labelPublicId: z.string().describe("The label's public ID"),
    },
    async ({ cardPublicId, labelPublicId }) => {
      const data = await kanRequest(
        "PUT",
        `/cards/${cardPublicId}/labels/${labelPublicId}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "toggle_card_member",
    "Add or remove a member assignment on a card (toggles if already assigned)",
    {
      cardPublicId: z.string().describe("The card's public ID"),
      workspaceMemberPublicId: z.string().describe("The workspace member's public ID"),
    },
    async ({ cardPublicId, workspaceMemberPublicId }) => {
      const data = await kanRequest(
        "PUT",
        `/cards/${cardPublicId}/members/${workspaceMemberPublicId}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
