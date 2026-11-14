import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { KanClient } from "../client.js";
import { findWorkspaceByName } from "./shared.js";

export function registerBoardTools(server: McpServer, client: KanClient): void {
  server.registerTool(
    "list_boards",
    {
      description:
        "List all boards in a workspace. Requires the workspace publicId — use find_workspace_by_name first if you only know the workspace name.",
      inputSchema: z.object({
        workspacePublicId: z
          .string()
          .min(12)
          .describe(
            "The workspace's 12-character public ID (not the name). Get it from list_workspaces or find_workspace_by_name first.",
          ),
      }),
    },
    async ({ workspacePublicId }) => {
      const data = await client.request(
        "GET",
        `/workspaces/${workspacePublicId}/boards`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "find_board_by_name",
    {
      description:
        "Find a board by workspace name and board name (both case-insensitive). Resolves workspace name → publicId, then board name → publicId automatically. Use this when you only know names.",
      inputSchema: z.object({
        workspaceName: z
          .string()
          .describe("The workspace name (e.g. 'UC Roleplay')"),
        boardName: z
          .string()
          .describe("The board name (e.g. 'Mechanics Rework')"),
      }),
    },
    async ({ workspaceName, boardName }) => {
      const result = await findWorkspaceByName(client, workspaceName);
      if (!result.found) {
        return { content: [{ type: "text", text: result.message }] };
      }
      const workspace = result.workspace;
      const boards = await client.request<{ publicId: string; name: string }[]>(
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
      return {
        content: [{ type: "text", text: JSON.stringify(board, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_board",
    {
      description:
        "Get a board by its public ID, including its lists and cards",
      inputSchema: z.object({
        boardPublicId: z.string().describe("The board's public ID"),
        labelPublicId: z
          .string()
          .optional()
          .describe("Filter cards by label public ID"),
        memberPublicId: z
          .string()
          .optional()
          .describe("Filter cards by member public ID"),
      }),
    },
    async ({ boardPublicId, labelPublicId, memberPublicId }) => {
      const params = new URLSearchParams();
      if (labelPublicId) params.set("labelPublicId", labelPublicId);
      if (memberPublicId) params.set("memberPublicId", memberPublicId);
      const qs = params.toString() ? `?${params}` : "";
      const data = await client.request("GET", `/boards/${boardPublicId}${qs}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_board_by_slug",
    {
      description:
        "Get a board by workspace slug and board slug. Only returns boards with public visibility.",
      inputSchema: z.object({
        workspaceSlug: z.string().describe("The workspace slug"),
        boardSlug: z.string().describe("The board slug"),
      }),
    },
    async ({ workspaceSlug, boardSlug }) => {
      const data = await client.request(
        "GET",
        `/workspaces/${workspaceSlug}/boards/${boardSlug}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_board",
    {
      description: "Create a new board in a workspace",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
        name: z.string().describe("Board name"),
        slug: z
          .string()
          .optional()
          .describe("URL-friendly slug (auto-generated if omitted)"),
        visibility: z
          .enum(["public", "private"])
          .optional()
          .describe("Board visibility (default: private)"),
      }),
    },
    async ({ workspacePublicId, name, slug, visibility }) => {
      const data = await client.request(
        "POST",
        `/workspaces/${workspacePublicId}/boards`,
        {
          name,
          slug,
          visibility,
          lists: [],
          labels: [],
        },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_board",
    {
      description:
        "Update a board's name, slug, visibility, or favorite status",
      inputSchema: z.object({
        boardPublicId: z.string().describe("The board's public ID"),
        name: z.string().optional().describe("New board name"),
        slug: z.string().optional().describe("New board slug"),
        visibility: z
          .enum(["public", "private"])
          .optional()
          .describe("New visibility"),
        isFavorite: z
          .boolean()
          .optional()
          .describe("Whether the board is favorited"),
      }),
    },
    async ({ boardPublicId, name, slug, visibility, isFavorite }) => {
      const data = await client.request("PUT", `/boards/${boardPublicId}`, {
        name,
        slug,
        visibility,
        favorite: isFavorite,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_board",
    {
      description: "Delete a board (soft delete)",
      inputSchema: z.object({
        boardPublicId: z.string().describe("The board's public ID"),
      }),
    },
    async ({ boardPublicId }) => {
      const data = await client.request("DELETE", `/boards/${boardPublicId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
