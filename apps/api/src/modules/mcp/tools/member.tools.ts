import type { IncomingHttpHeaders } from "http";
import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
import { z } from "zod";

import { headersFromRaw } from "../../../common/session.util.js";
import { UpdateMemberRoleSchema } from "../../member/dto/member.dto.js";
import { MemberService } from "../../member/member.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { memberPublicId, workspacePublicId } from "./public-ids.js";

const InviteMemberWithWorkspaceSchema = z.object({
  workspacePublicId,
  email: z.string().email().describe("Email address to invite."),
});

const RemoveMemberSchema = z.object({
  workspacePublicId,
  memberPublicId,
});

const UpdateMemberRoleWithIdsSchema = UpdateMemberRoleSchema.extend({
  workspacePublicId,
  memberPublicId,
});

const WorkspaceInviteLinkSchema = z.object({
  workspacePublicId,
});

@UseFilters(McpExceptionFilter)
@McpController()
export class MemberTools {
  constructor(private readonly memberService: MemberService) {}

  @Tool({
    name: "invite_member",
    description:
      "Invite a member to a workspace, on behalf of the current user.",
    parameters: InviteMemberWithWorkspaceSchema,
  })
  async inviteMember(
    @Payload() args: z.infer<typeof InviteMemberWithWorkspaceSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest()
    rawRequest: { user?: unknown; headers?: IncomingHttpHeaders } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);

    return this.memberService.invite({
      workspacePublicId: args.workspacePublicId,
      email: args.email,
      userId: user.id,
      headers: headersFromRaw(rawRequest?.headers ?? {}),
    });
  }

  @Tool({
    name: "remove_member",
    description:
      "Remove a member from a workspace, on behalf of the current user.",
    parameters: RemoveMemberSchema,
  })
  async removeMember(
    @Payload() args: z.infer<typeof RemoveMemberSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.memberService.delete({
      workspacePublicId: args.workspacePublicId,
      memberPublicId: args.memberPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "update_member_role",
    description:
      "Update a member's role in a workspace, on behalf of the current user.",
    parameters: UpdateMemberRoleWithIdsSchema,
  })
  async updateMemberRole(
    @Payload() args: z.infer<typeof UpdateMemberRoleWithIdsSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.memberService.updateRole({
      workspacePublicId: args.workspacePublicId,
      memberPublicId: args.memberPublicId,
      role: args.role,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_workspace_invite_link",
    description:
      "Get the active invite link for a workspace, on behalf of the current user.",
    parameters: WorkspaceInviteLinkSchema,
  })
  async getWorkspaceInviteLink(
    @Payload() args: z.infer<typeof WorkspaceInviteLinkSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.memberService.getActiveInviteLink({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "create_workspace_invite_link",
    description:
      "Create an invite link for a workspace, on behalf of the current user.",
    parameters: WorkspaceInviteLinkSchema,
  })
  async createWorkspaceInviteLink(
    @Payload() args: z.infer<typeof WorkspaceInviteLinkSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.memberService.createInviteLink({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "deactivate_workspace_invite_links",
    description:
      "Deactivate the active invite link for a workspace, on behalf of the current user.",
    parameters: WorkspaceInviteLinkSchema,
  })
  async deactivateWorkspaceInviteLinks(
    @Payload() args: z.infer<typeof WorkspaceInviteLinkSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.memberService.deactivateInviteLink({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }
}
