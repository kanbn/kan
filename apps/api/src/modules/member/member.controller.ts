import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../../common/interfaces/request.interface.js";
import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { headersFromRaw } from "../../common/session.util.js";
import {
  AcceptInviteLinkDto,
  AcceptInviteLinkResponseDto,
  ActiveInviteLinkResponseDto,
  CreateInviteLinkResponseDto,
  DeactivateInviteLinkResponseDto,
  DeleteMemberResponseDto,
  InviteByCodeResponseDto,
  InviteMemberDto,
  MemberInviteResponseDto,
  UpdateMemberRoleDto,
  UpdateMemberRoleResponseDto,
} from "./dto/member.dto.js";
import { MemberService } from "./member.service.js";

@AuthenticatedController("Workspaces", "workspaces")
export class WorkspaceMemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post(":workspacePublicId/members/invite")
  @ApiOperation({
    operationId: "inviteMember",
    summary: "Invite a member to a workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 201, type: MemberInviteResponseDto })
  async invite(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Body() input: InviteMemberDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MemberInviteResponseDto> {
    return this.memberService.invite({
      workspacePublicId,
      email: input.email,
      userId: user.id,
      headers: headersFromRaw(req.headers),
    });
  }

  @Delete(":workspacePublicId/members/:memberPublicId")
  @ApiOperation({
    operationId: "deleteMember",
    summary: "Delete a member from a workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "memberPublicId" })
  @ApiResponse({ status: 200, type: DeleteMemberResponseDto })
  async delete(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("memberPublicId") memberPublicId: string,
  ): Promise<DeleteMemberResponseDto> {
    return this.memberService.delete({
      workspacePublicId,
      memberPublicId,
      userId: user.id,
    });
  }

  @Put(":workspacePublicId/members/:memberPublicId/role")
  @ApiOperation({
    operationId: "updateMemberRole",
    summary: "Update member role",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "memberPublicId" })
  @ApiResponse({ status: 200, type: UpdateMemberRoleResponseDto })
  async updateRole(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("memberPublicId") memberPublicId: string,
    @Body() input: UpdateMemberRoleDto,
  ): Promise<UpdateMemberRoleResponseDto> {
    return this.memberService.updateRole({
      workspacePublicId,
      memberPublicId,
      role: input.role,
      userId: user.id,
    });
  }

  @Get(":workspacePublicId/invite")
  @ApiOperation({
    operationId: "getActiveInviteLink",
    summary: "Get active invite link for workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 200, type: ActiveInviteLinkResponseDto })
  async getActiveInviteLink(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<ActiveInviteLinkResponseDto> {
    return this.memberService.getActiveInviteLink({
      workspacePublicId,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/invites")
  @ApiOperation({
    operationId: "createInviteLink",
    summary: "Create invite link for workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 201, type: CreateInviteLinkResponseDto })
  async createInviteLink(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<CreateInviteLinkResponseDto> {
    return this.memberService.createInviteLink({
      workspacePublicId,
      userId: user.id,
    });
  }

  @Delete(":workspacePublicId/invites")
  @ApiOperation({
    operationId: "deactivateInviteLink",
    summary: "Deactivate invite link for workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 200, type: DeactivateInviteLinkResponseDto })
  async deactivateInviteLink(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<DeactivateInviteLinkResponseDto> {
    return this.memberService.deactivateInviteLink({
      workspacePublicId,
      userId: user.id,
    });
  }
}

@Controller("invites")
export class InviteController {
  constructor(private readonly memberService: MemberService) {}

  @Get(":inviteCode")
  @ApiOperation({
    operationId: "getInviteByCode",
    summary: "Get invite information by code",
  })
  @ApiParam({ name: "inviteCode" })
  @ApiResponse({ status: 200, type: InviteByCodeResponseDto })
  async getInviteByCode(
    @Param("inviteCode") inviteCode: string,
  ): Promise<InviteByCodeResponseDto> {
    return this.memberService.getInviteByCode({ inviteCode });
  }
}

@AuthenticatedController("Invites", "invites")
export class AuthenticatedInviteController {
  constructor(private readonly memberService: MemberService) {}

  @Post("accept")
  @ApiOperation({
    operationId: "acceptInviteLink",
    summary: "Accept an invite link",
  })
  @ApiResponse({ status: 200, type: AcceptInviteLinkResponseDto })
  async acceptInviteLink(
    @CurrentUser() user: User,
    @Body() input: AcceptInviteLinkDto,
  ): Promise<AcceptInviteLinkResponseDto> {
    return this.memberService.acceptInviteLink({
      inviteCode: input.inviteCode,
      userId: user.id,
    });
  }
}
