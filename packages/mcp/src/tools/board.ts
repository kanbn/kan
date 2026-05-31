import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

export function registerBoardTools(server: McpServer): void {
  server.tool(
    "list_boards",
    "List all boards in a workspace. Requires the workspace publicId — use find_workspace_by_name first if you only know the workspace name.",
    { workspacePublicId: z.string().min(12).describe("The workspace's 12-character public ID (not the name). Get it from list_workspaces or find_workspace_by_name first.") },
    async ({ workspacePublicId }) => {
      const data = await kanRequest("GET", `/workspaces/${workspacePublicId}/boards`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "find_board_by_name",
    "Find a board by workspace name and board name (both case-insensitive). Resolves workspace name → publicId, then board name → publicId automatically. Use this when you only know names.",
    {
      workspaceName: z.string().describe("The workspace name (e.g. 'UC Roleplay')"),
      boardName: z.string().describe("The board name (e.g. 'Mechanics Rework')"),
    },
    async ({ workspaceName, boardName }) => {
      const workspaces = await kanRequest<{ publicId: string; name: string }[]>("GET", "/workspaces");
      const workspace = workspaces.find(
        (w) => w.name.toLowerCase() === workspaceName.toLowerCase(),
      );
      if (!workspace) {
        const names = workspaces.map((w) => w.name).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `No workspace found with name "${workspaceName}". Available: ${names}`,
            },
          ],
        };
      }
      const boards = await kanRequest<{ publicId: string; name: string }[]>(
        "GET",
        `/workspaces/${workspace.publicId}/boards`,
      );
      const board = boards.find(
        (b) => b.name.toLowerCase() === boardName.toLowerCase(),
      );
      if (!board) {
        const names = boards.map((b) => b.name).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `No board found with name "${boardName}" in workspace "${workspaceName}". Available boards: ${names}`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(board, null, 2) }] };
    },
  );

  server.tool(
    "get_board",
    "Get a board by its public ID, including its lists and cards",
    {
      boardPublicId: z.string().describe("The board's public ID"),
      labelPublicId: z.string().optional().describe("Filter cards by label public ID"),
      memberPublicId: z.string().optional().describe("Filter cards by member public ID"),
    },
    async ({ boardPublicId, labelPublicId, memberPublicId }) => {
      const params = new URLSearchParams();
      if (labelPublicId) params.set("labelPublicId", labelPublicId);
      if (memberPublicId) params.set("memberPublicId", memberPublicId);
      const qs = params.toString() ? `?${params}` : "";
      const data = await kanRequest("GET", `/boards/${boardPublicId}${qs}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "get_board_by_slug",
    "Get a board by workspace slug and board slug",
    {
      workspaceSlug: z.string().describe("The workspace slug"),
      boardSlug: z.string().describe("The board slug"),
    },
    async ({ workspaceSlug, boardSlug }) => {
      const data = await kanRequest("GET", `/workspaces/${workspaceSlug}/boards/${boardSlug}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_board",
    "Create a new board in a workspace",
    {
      workspacePublicId: z.string().describe("The workspace's public ID"),
      name: z.string().describe("Board name"),
      slug: z.string().optional().describe("URL-friendly slug (auto-generated if omitted)"),
      visibility: z
        .enum(["public", "private"])
        .optional()
        .describe("Board visibility (default: private)"),
    },
    async ({ workspacePublicId, name, slug, visibility }) => {
      const data = await kanRequest("POST", `/workspaces/${workspacePublicId}/boards`, {
        name,
        slug,
        visibility,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_board",
    "Update a board's name, slug, visibility, or favorite status",
    {
      boardPublicId: z.string().describe("The board's public ID"),
      name: z.string().optional().describe("New board name"),
      slug: z.string().optional().describe("New board slug"),
      visibility: z.enum(["public", "private"]).optional().describe("New visibility"),
      isFavorite: z.boolean().optional().describe("Whether the board is favorited"),
    },
    async ({ boardPublicId, name, slug, visibility, isFavorite }) => {
      const data = await kanRequest("PUT", `/boards/${boardPublicId}`, {
        name,
        slug,
        visibility,
        isFavorite,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_board",
    "Delete a board (soft delete)",
    { boardPublicId: z.string().describe("The board's public ID") },
    async ({ boardPublicId }) => {
      const data = await kanRequest("DELETE", `/boards/${boardPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
