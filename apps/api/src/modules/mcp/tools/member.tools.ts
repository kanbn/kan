import type { IncomingHttpHeaders } from "http";
import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";

import { headersFromRaw } from "../../../common/session.util.js";
import { UpdateMemberRoleSchema } from "../../member/dto/member.dto.js";
import { MemberService } from "../../member/member.service.js";
import { requireMcpUser } from "../mcp-user.util.js";

const InviteMemberWithWorkspaceSchema = z.object({
  workspacePublicId: z.string().min(12),
  email: z.string().email(),
});

const RemoveMemberSchema = z.object({
  workspacePublicId: z.string().min(12),
  memberPublicId: z.string().min(12),
});

const UpdateMemberRoleWithIdsSchema = UpdateMemberRoleSchema.extend({
  workspacePublicId: z.string().min(12),
  memberPublicId: z.string().min(12),
});

const WorkspaceInviteLinkSchema = z.object({
  workspacePublicId: z.string().min(12),
});

@Injectable()
export class MemberTools {
  constructor(private readonly memberService: MemberService) {}

  @Tool({
    name: "invite_member",
    description:
      "Invite a member to a workspace, on behalf of the current user.",
    parameters: InviteMemberWithWorkspaceSchema,
  })
  async inviteMember(
    args: z.infer<typeof InviteMemberWithWorkspaceSchema>,
    _context: unknown,
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
    args: z.infer<typeof RemoveMemberSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof UpdateMemberRoleWithIdsSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof WorkspaceInviteLinkSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof WorkspaceInviteLinkSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
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
    args: z.infer<typeof WorkspaceInviteLinkSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.memberService.deactivateInviteLink({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }
}
