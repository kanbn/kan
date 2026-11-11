import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";

import { PermissionActionSchema } from "../../permission/dto/permission.dto.js";
import { PermissionService } from "../../permission/permission.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import {
  memberPublicId,
  rolePublicId,
  workspacePublicId,
} from "./public-ids.js";

const WorkspaceSchema = z.object({
  workspacePublicId,
});

const WorkspaceMemberSchema = z.object({
  workspacePublicId,
  memberPublicId,
});

const MemberPermissionActionSchema = WorkspaceMemberSchema.extend(
  PermissionActionSchema.shape,
);

const WorkspaceRoleSchema = z.object({
  workspacePublicId,
  rolePublicId,
});

const RolePermissionActionSchema = WorkspaceRoleSchema.extend(
  PermissionActionSchema.shape,
);

@Injectable()
export class PermissionTools {
  constructor(private readonly permissionService: PermissionService) {}

  @Tool({
    name: "get_my_permissions",
    description: "Get the current user's permissions in a workspace.",
    parameters: WorkspaceSchema,
  })
  async getMyPermissions(
    args: z.infer<typeof WorkspaceSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.getMyPermissions({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_member_permissions",
    description: "Get a specific member's permissions in a workspace.",
    parameters: WorkspaceMemberSchema,
  })
  async getMemberPermissions(
    args: z.infer<typeof WorkspaceMemberSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.getMemberPermissions({
      workspacePublicId: args.workspacePublicId,
      memberPublicId: args.memberPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "grant_member_permission",
    description:
      "Grant a specific permission to a member, on behalf of the current user.",
    parameters: MemberPermissionActionSchema,
  })
  async grantMemberPermission(
    args: z.infer<typeof MemberPermissionActionSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.grantPermission({
      workspacePublicId: args.workspacePublicId,
      memberPublicId: args.memberPublicId,
      permission: args.permission,
      userId: user.id,
    });
  }

  @Tool({
    name: "revoke_member_permission",
    description:
      "Revoke a specific permission from a member, on behalf of the current user.",
    parameters: MemberPermissionActionSchema,
  })
  async revokeMemberPermission(
    args: z.infer<typeof MemberPermissionActionSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.revokePermission({
      workspacePublicId: args.workspacePublicId,
      memberPublicId: args.memberPublicId,
      permission: args.permission,
      userId: user.id,
    });
  }

  @Tool({
    name: "reset_member_permissions",
    description:
      "Clear a member's custom permission overrides so they inherit only their role's permissions, on behalf of the current user.",
    parameters: WorkspaceMemberSchema,
  })
  async resetMemberPermissions(
    args: z.infer<typeof WorkspaceMemberSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.resetMemberPermissions({
      workspacePublicId: args.workspacePublicId,
      memberPublicId: args.memberPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "reset_workspace_member_permissions",
    description:
      "Clear all custom permission overrides for every member in a workspace, on behalf of the current user.",
    parameters: WorkspaceSchema,
  })
  async resetWorkspaceMemberPermissions(
    args: z.infer<typeof WorkspaceSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.resetWorkspaceMemberPermissions({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_workspace_roles",
    description: "Get all roles for a workspace.",
    parameters: WorkspaceSchema,
  })
  async getWorkspaceRoles(
    args: z.infer<typeof WorkspaceSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.getWorkspaceRoles({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_workspace_role_permissions",
    description:
      "Get all roles for a workspace with their granted permissions.",
    parameters: WorkspaceSchema,
  })
  async getWorkspaceRolePermissions(
    args: z.infer<typeof WorkspaceSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.getWorkspaceRolePermissions({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_role_permissions",
    description: "Get permissions granted to a specific role in a workspace.",
    parameters: WorkspaceRoleSchema,
  })
  async getRolePermissions(
    args: z.infer<typeof WorkspaceRoleSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.getRolePermissions({
      workspacePublicId: args.workspacePublicId,
      rolePublicId: args.rolePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "grant_role_permission",
    description:
      "Grant a specific permission to a role, on behalf of the current user.",
    parameters: RolePermissionActionSchema,
  })
  async grantRolePermission(
    args: z.infer<typeof RolePermissionActionSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.grantRolePermission({
      workspacePublicId: args.workspacePublicId,
      rolePublicId: args.rolePublicId,
      permission: args.permission,
      userId: user.id,
    });
  }

  @Tool({
    name: "revoke_role_permission",
    description:
      "Revoke a specific permission from a role, on behalf of the current user.",
    parameters: RolePermissionActionSchema,
  })
  async revokeRolePermission(
    args: z.infer<typeof RolePermissionActionSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.permissionService.revokeRolePermission({
      workspacePublicId: args.workspacePublicId,
      rolePublicId: args.rolePublicId,
      permission: args.permission,
      userId: user.id,
    });
  }
}
