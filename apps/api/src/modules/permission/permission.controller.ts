import { Body, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

import type { User } from "../../common/interfaces/user.interface.js";
import { AuthenticatedController } from "../../common/decorators/authenticated-controller.decorator.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import {
  GetMemberPermissionsResponseDto,
  GetMyPermissionsResponseDto,
  GetRolePermissionsResponseDto,
  GetWorkspaceRolePermissionsResponseDto,
  GetWorkspaceRolesResponseDto,
  PermissionActionDto,
  SuccessResponseDto,
} from "./dto/permission.dto.js";
import { PermissionService } from "./permission.service.js";

@AuthenticatedController("Permissions", "workspaces")
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get(":workspacePublicId/permissions/me")
  @ApiOperation({
    operationId: "getMyPermissions",
    summary: "Get my permissions",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 200, type: GetMyPermissionsResponseDto })
  async getMyPermissions(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<GetMyPermissionsResponseDto> {
    return this.permissionService.getMyPermissions({
      workspacePublicId,
      userId: user.id,
    });
  }

  @Get(":workspacePublicId/members/:memberPublicId/permissions")
  @ApiOperation({
    operationId: "getMemberPermissions",
    summary: "Get member permissions",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "memberPublicId" })
  @ApiResponse({ status: 200, type: GetMemberPermissionsResponseDto })
  async getMemberPermissions(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("memberPublicId") memberPublicId: string,
  ): Promise<GetMemberPermissionsResponseDto> {
    return this.permissionService.getMemberPermissions({
      workspacePublicId,
      memberPublicId,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/members/:memberPublicId/permissions/grant")
  @ApiOperation({
    operationId: "grantPermission",
    summary: "Grant permission to member",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "memberPublicId" })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async grantPermission(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("memberPublicId") memberPublicId: string,
    @Body() input: PermissionActionDto,
  ): Promise<SuccessResponseDto> {
    return this.permissionService.grantPermission({
      workspacePublicId,
      memberPublicId,
      permission: input.permission,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/members/:memberPublicId/permissions/revoke")
  @ApiOperation({
    operationId: "revokePermission",
    summary: "Revoke permission from member",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "memberPublicId" })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async revokePermission(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("memberPublicId") memberPublicId: string,
    @Body() input: PermissionActionDto,
  ): Promise<SuccessResponseDto> {
    return this.permissionService.revokePermission({
      workspacePublicId,
      memberPublicId,
      permission: input.permission,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/members/:memberPublicId/permissions/reset")
  @ApiOperation({
    operationId: "resetMemberPermissions",
    summary: "Reset member permissions to role defaults",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "memberPublicId" })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async resetMemberPermissions(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("memberPublicId") memberPublicId: string,
  ): Promise<SuccessResponseDto> {
    return this.permissionService.resetMemberPermissions({
      workspacePublicId,
      memberPublicId,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/members/permissions/reset")
  @ApiOperation({
    operationId: "resetWorkspaceMemberPermissions",
    summary: "Reset all member permission overrides in a workspace",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async resetWorkspaceMemberPermissions(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<SuccessResponseDto> {
    return this.permissionService.resetWorkspaceMemberPermissions({
      workspacePublicId,
      userId: user.id,
    });
  }

  @Get(":workspacePublicId/roles")
  @ApiOperation({
    operationId: "getWorkspaceRoles",
    summary: "Get workspace roles",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 200, type: GetWorkspaceRolesResponseDto })
  async getWorkspaceRoles(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<GetWorkspaceRolesResponseDto> {
    return this.permissionService.getWorkspaceRoles({
      workspacePublicId,
      userId: user.id,
    });
  }

  @Get(":workspacePublicId/roles/permissions")
  @ApiOperation({
    operationId: "getWorkspaceRolePermissions",
    summary: "Get workspace role permissions",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiResponse({ status: 200, type: GetWorkspaceRolePermissionsResponseDto })
  async getWorkspaceRolePermissions(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
  ): Promise<GetWorkspaceRolePermissionsResponseDto> {
    return this.permissionService.getWorkspaceRolePermissions({
      workspacePublicId,
      userId: user.id,
    });
  }

  @Get(":workspacePublicId/roles/:rolePublicId/permissions")
  @ApiOperation({
    operationId: "getRolePermissions",
    summary: "Get role permissions",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "rolePublicId" })
  @ApiResponse({ status: 200, type: GetRolePermissionsResponseDto })
  async getRolePermissions(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("rolePublicId") rolePublicId: string,
  ): Promise<GetRolePermissionsResponseDto> {
    return this.permissionService.getRolePermissions({
      workspacePublicId,
      rolePublicId,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/roles/:rolePublicId/permissions/grant")
  @ApiOperation({
    operationId: "grantRolePermission",
    summary: "Grant permission to role",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "rolePublicId" })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async grantRolePermission(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("rolePublicId") rolePublicId: string,
    @Body() input: PermissionActionDto,
  ): Promise<SuccessResponseDto> {
    return this.permissionService.grantRolePermission({
      workspacePublicId,
      rolePublicId,
      permission: input.permission,
      userId: user.id,
    });
  }

  @Post(":workspacePublicId/roles/:rolePublicId/permissions/revoke")
  @ApiOperation({
    operationId: "revokeRolePermission",
    summary: "Revoke permission from role",
  })
  @ApiParam({ name: "workspacePublicId" })
  @ApiParam({ name: "rolePublicId" })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  async revokeRolePermission(
    @CurrentUser() user: User,
    @Param("workspacePublicId") workspacePublicId: string,
    @Param("rolePublicId") rolePublicId: string,
    @Body() input: PermissionActionDto,
  ): Promise<SuccessResponseDto> {
    return this.permissionService.revokeRolePermission({
      workspacePublicId,
      rolePublicId,
      permission: input.permission,
      userId: user.id,
    });
  }
}
