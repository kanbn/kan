import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

export function registerMemberTools(server: McpServer): void {
  server.tool(
    "invite_member",
    "Invite a user to a workspace by email",
    {
      workspacePublicId: z.string().describe("The workspace's public ID"),
      email: z.string().email().describe("Email address to invite"),
      role: z
        .enum(["admin", "member", "guest"])
        .optional()
        .describe("Role to assign (default: member)"),
    },
    async ({ workspacePublicId, email, role }) => {
      const data = await kanRequest(
        "POST",
        `/workspaces/${workspacePublicId}/members/invite`,
        { email, role },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "remove_member",
    "Remove a member from a workspace",
    {
      workspacePublicId: z.string().describe("The workspace's public ID"),
      memberPublicId: z.string().describe("The workspace member's public ID"),
    },
    async ({ workspacePublicId, memberPublicId }) => {
      const data = await kanRequest(
        "DELETE",
        `/workspaces/${workspacePublicId}/members/${memberPublicId}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_member_role",
    "Change the role of a workspace member",
    {
      workspacePublicId: z.string().describe("The workspace's public ID"),
      memberPublicId: z.string().describe("The workspace member's public ID"),
      role: z.enum(["admin", "member", "guest"]).describe("New role"),
    },
    async ({ workspacePublicId, memberPublicId, role }) => {
      const data = await kanRequest(
        "PUT",
        `/workspaces/${workspacePublicId}/members/${memberPublicId}/role`,
        { role },
      );
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "get_workspace_invite_link",
    "Get the active invite link for a workspace",
    { workspacePublicId: z.string().describe("The workspace's public ID") },
    async ({ workspacePublicId }) => {
      const data = await kanRequest("GET", `/workspaces/${workspacePublicId}/invite`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_workspace_invite_link",
    "Create a new invite link for a workspace (7-day expiry)",
    { workspacePublicId: z.string().describe("The workspace's public ID") },
    async ({ workspacePublicId }) => {
      const data = await kanRequest("POST", `/workspaces/${workspacePublicId}/invites`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "deactivate_workspace_invite_links",
    "Deactivate all active invite links for a workspace",
    { workspacePublicId: z.string().describe("The workspace's public ID") },
    async ({ workspacePublicId }) => {
      const data = await kanRequest("DELETE", `/workspaces/${workspacePublicId}/invites`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
