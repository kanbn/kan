import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

export function registerWorkspaceTools(server: McpServer): void {
  server.tool(
    "list_workspaces",
    "List all workspaces the authenticated user belongs to. Call this first to resolve a workspace name to its publicId before calling any other workspace-scoped tool.",
    {},
    async () => {
      const data = await kanRequest("GET", "/workspaces");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "find_workspace_by_name",
    "Find a workspace by its name (case-insensitive). Returns the matching workspace including its publicId. Use this whenever you only know the workspace name and need its publicId.",
    { name: z.string().describe("Workspace name to search for") },
    async ({ name }) => {
      const workspaces = await kanRequest<{ publicId: string; name: string }[]>("GET", "/workspaces");
      const match = workspaces.find(
        (w) => w.name.toLowerCase() === name.toLowerCase(),
      );
      if (!match) {
        const names = workspaces.map((w) => w.name).join(", ");
        return {
          content: [
            {
              type: "text",
              text: `No workspace found with name "${name}". Available workspaces: ${names}`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(match, null, 2) }] };
    },
  );

  server.tool(
    "get_workspace",
    "Get a workspace by its public ID, including its members",
    { workspacePublicId: z.string().describe("The workspace's public ID") },
    async ({ workspacePublicId }) => {
      const data = await kanRequest("GET", `/workspaces/${workspacePublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "get_workspace_by_slug",
    "Get a workspace by its slug, including its boards",
    { workspaceSlug: z.string().describe("The workspace slug") },
    async ({ workspaceSlug }) => {
      const data = await kanRequest("GET", `/workspaces/${workspaceSlug}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_workspace",
    "Create a new workspace",
    {
      name: z.string().describe("Workspace name"),
      slug: z.string().optional().describe("URL-friendly slug (auto-generated if omitted)"),
    },
    async ({ name, slug }) => {
      const data = await kanRequest("POST", "/workspaces", { name, slug });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_workspace",
    "Update a workspace's name or slug",
    {
      workspacePublicId: z.string().describe("The workspace's public ID"),
      name: z.string().optional().describe("New workspace name"),
      slug: z.string().optional().describe("New workspace slug"),
    },
    async ({ workspacePublicId, name, slug }) => {
      const data = await kanRequest("PUT", `/workspaces/${workspacePublicId}`, { name, slug });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_workspace",
    "Permanently delete a workspace",
    { workspacePublicId: z.string().describe("The workspace's public ID") },
    async ({ workspacePublicId }) => {
      const data = await kanRequest("DELETE", `/workspaces/${workspacePublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "search_workspace",
    "Search for boards and cards by title within a workspace",
    {
      workspacePublicId: z.string().describe("The workspace's public ID"),
      query: z.string().describe("Search query string"),
    },
    async ({ workspacePublicId, query }) => {
      const params = new URLSearchParams({ query });
      const data = await kanRequest("GET", `/workspaces/${workspacePublicId}/search?${params}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "check_workspace_slug_availability",
    "Check whether a workspace slug is available",
    { slug: z.string().describe("Slug to check") },
    async ({ slug }) => {
      const params = new URLSearchParams({ slug });
      const data = await kanRequest("GET", `/workspaces/check-slug-availability?${params}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
