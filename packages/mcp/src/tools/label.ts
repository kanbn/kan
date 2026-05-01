import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

export function registerLabelTools(server: McpServer): void {
  server.tool(
    "get_label",
    "Get a label by its public ID",
    { labelPublicId: z.string().describe("The label's public ID") },
    async ({ labelPublicId }) => {
      const data = await kanRequest("GET", `/labels/${labelPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_label",
    "Create a label for a board",
    {
      boardPublicId: z.string().describe("The board's public ID"),
      name: z.string().describe("Label name"),
      color: z.string().optional().describe("Label color (hex, e.g. #FF5733)"),
    },
    async ({ boardPublicId, name, color }) => {
      const data = await kanRequest("POST", "/labels", { boardPublicId, name, color });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_label",
    "Update a label's name or color",
    {
      labelPublicId: z.string().describe("The label's public ID"),
      name: z.string().optional().describe("New label name"),
      color: z.string().optional().describe("New label color (hex)"),
    },
    async ({ labelPublicId, name, color }) => {
      const data = await kanRequest("PUT", `/labels/${labelPublicId}`, { name, color });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_label",
    "Delete a label",
    { labelPublicId: z.string().describe("The label's public ID") },
    async ({ labelPublicId }) => {
      const data = await kanRequest("DELETE", `/labels/${labelPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
