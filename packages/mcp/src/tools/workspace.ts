import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { KanClient } from "../client.js";
import { findWorkspaceByName } from "./shared.js";

export function registerWorkspaceTools(
  server: McpServer,
  client: KanClient,
): void {
  server.registerTool(
    "list_workspaces",
    {
      description:
        "List all workspaces the authenticated user belongs to. Call this first to resolve a workspace name to its publicId before calling any other workspace-scoped tool.",
      inputSchema: z.object({}),
    },
    async () => {
      const memberships = await client.request<
        { workspace: Record<string, unknown> }[]
      >("GET", "/workspaces");
      const workspaces = memberships.map((m) => m.workspace);
      return {
        content: [{ type: "text", text: JSON.stringify(workspaces, null, 2) }],
      };
    },
  );

  server.registerTool(
    "find_workspace_by_name",
    {
      description:
        "Find a workspace by its name (case-insensitive). Returns the matching workspace including its publicId. Use this whenever you only know the workspace name and need its publicId.",
      inputSchema: z.object({
        name: z.string().describe("Workspace name to search for"),
      }),
    },
    async ({ name }) => {
      const result = await findWorkspaceByName(client, name);
      if (!result.found) {
        return { content: [{ type: "text", text: result.message }] };
      }
      return {
        content: [
          { type: "text", text: JSON.stringify(result.workspace, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "get_workspace",
    {
      description: "Get a workspace by its public ID, including its members",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
      }),
    },
    async ({ workspacePublicId }) => {
      const data = await client.request(
        "GET",
        `/workspaces/${workspacePublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_workspace_by_slug",
    {
      description: "Get a workspace by its slug, including its boards",
      inputSchema: z.object({
        workspaceSlug: z.string().describe("The workspace slug"),
      }),
    },
    async ({ workspaceSlug }) => {
      const data = await client.request("GET", `/workspaces/${workspaceSlug}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_workspace",
    {
      description: "Create a new workspace",
      inputSchema: z.object({
        name: z.string().describe("Workspace name"),
        slug: z
          .string()
          .optional()
          .describe("URL-friendly slug (auto-generated if omitted)"),
      }),
    },
    async ({ name, slug }) => {
      const data = await client.request("POST", "/workspaces", { name, slug });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_workspace",
    {
      description: "Update a workspace's name or slug",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
        name: z.string().optional().describe("New workspace name"),
        slug: z.string().optional().describe("New workspace slug"),
      }),
    },
    async ({ workspacePublicId, name, slug }) => {
      const data = await client.request(
        "PUT",
        `/workspaces/${workspacePublicId}`,
        { name, slug },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "delete_workspace",
    {
      description: "Permanently delete a workspace",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
      }),
    },
    async ({ workspacePublicId }) => {
      const data = await client.request(
        "DELETE",
        `/workspaces/${workspacePublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "search_workspace",
    {
      description: "Search for boards and cards by title within a workspace",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
        query: z.string().describe("Search query string"),
      }),
    },
    async ({ workspacePublicId, query }) => {
      const params = new URLSearchParams({ query });
      const data = await client.request(
        "GET",
        `/workspaces/${workspacePublicId}/search?${params}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "check_workspace_slug_availability",
    {
      description: "Check whether a workspace slug is available",
      inputSchema: z.object({ slug: z.string().describe("Slug to check") }),
    },
    async ({ slug }) => {
      const params = new URLSearchParams({ workspaceSlug: slug });
      const data = await client.request(
        "GET",
        `/workspaces/check-slug-availability?${params}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
