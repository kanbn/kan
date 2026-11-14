import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { KanClient } from "../client.js";

export function registerMemberTools(
  server: McpServer,
  client: KanClient,
): void {
  server.registerTool(
    "invite_member",
    {
      description: "Invite a user to a workspace by email",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
        email: z.string().email().describe("Email address to invite"),
        role: z
          .enum(["admin", "member", "guest"])
          .optional()
          .describe("Role to assign (default: member)"),
      }),
    },
    async ({ workspacePublicId, email, role }) => {
      const data = await client.request(
        "POST",
        `/workspaces/${workspacePublicId}/members/invite`,
        { email, role },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "remove_member",
    {
      description: "Remove a member from a workspace",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
        memberPublicId: z.string().describe("The workspace member's public ID"),
      }),
    },
    async ({ workspacePublicId, memberPublicId }) => {
      const data = await client.request(
        "DELETE",
        `/workspaces/${workspacePublicId}/members/${memberPublicId}`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "update_member_role",
    {
      description: "Change the role of a workspace member",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
        memberPublicId: z.string().describe("The workspace member's public ID"),
        role: z.enum(["admin", "member", "guest"]).describe("New role"),
      }),
    },
    async ({ workspacePublicId, memberPublicId, role }) => {
      const data = await client.request(
        "PUT",
        `/workspaces/${workspacePublicId}/members/${memberPublicId}/role`,
        { role },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_workspace_invite_link",
    {
      description: "Get the active invite link for a workspace",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
      }),
    },
    async ({ workspacePublicId }) => {
      const data = await client.request(
        "GET",
        `/workspaces/${workspacePublicId}/invite`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "create_workspace_invite_link",
    {
      description: "Create a new invite link for a workspace (7-day expiry)",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
      }),
    },
    async ({ workspacePublicId }) => {
      const data = await client.request(
        "POST",
        `/workspaces/${workspacePublicId}/invites`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "deactivate_workspace_invite_links",
    {
      description: "Deactivate all active invite links for a workspace",
      inputSchema: z.object({
        workspacePublicId: z.string().describe("The workspace's public ID"),
      }),
    },
    async ({ workspacePublicId }) => {
      const data = await client.request(
        "DELETE",
        `/workspaces/${workspacePublicId}/invites`,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    },
  );
}
