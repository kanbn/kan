import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";

import {
  CheckSlugAvailabilityQuerySchema,
  CreateWorkspaceSchema,
  SearchQuerySchema,
  UpdateWorkspaceSchema,
} from "../../workspace/dto/workspace.dto.js";
import { WorkspaceService } from "../../workspace/workspace.service.js";
import { requireMcpUser } from "../mcp-user.util.js";

const WorkspaceIdSchema = z.object({
  workspacePublicId: z.string().min(12),
});

const WorkspaceSlugSchema = z.object({
  workspaceSlug: z.string().min(1),
});

const UpdateWorkspaceWithIdSchema = UpdateWorkspaceSchema.extend({
  workspacePublicId: z.string().min(12),
});

const SearchWorkspaceSchema = SearchQuerySchema.extend({
  workspacePublicId: z.string().min(12),
});

@Injectable()
export class WorkspaceTools {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Tool({
    name: "list_workspaces",
    description: "List all workspaces the current user belongs to.",
    parameters: z.object({}),
  })
  async listWorkspaces(
    _args: Record<string, never>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.all({ userId: user.id });
  }

  @Tool({
    name: "check_workspace_slug_availability",
    description: "Check whether a workspace slug is available.",
    parameters: CheckSlugAvailabilityQuerySchema,
  })
  async checkWorkspaceSlugAvailability(
    args: z.infer<typeof CheckSlugAvailabilityQuerySchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.checkSlugAvailability({
      workspaceSlug: args.workspaceSlug,
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_workspace",
    description: "Get a workspace by its public ID.",
    parameters: WorkspaceIdSchema,
  })
  async getWorkspace(
    args: z.infer<typeof WorkspaceIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.byId({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "get_workspace_by_slug",
    description: "Get a workspace by its slug.",
    parameters: WorkspaceSlugSchema,
  })
  async getWorkspaceBySlug(
    args: z.infer<typeof WorkspaceSlugSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.bySlug({
      workspaceSlug: args.workspaceSlug,
      userId: user.id,
    });
  }

  @Tool({
    name: "create_workspace",
    description: "Create a workspace, on behalf of the current user.",
    parameters: CreateWorkspaceSchema,
  })
  async createWorkspace(
    args: z.infer<typeof CreateWorkspaceSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.create({
      name: args.name,
      description: args.description,
      slug: args.slug,
      userId: user.id,
      userEmail: user.email,
    });
  }

  @Tool({
    name: "update_workspace",
    description: "Update a workspace, on behalf of the current user.",
    parameters: UpdateWorkspaceWithIdSchema,
  })
  async updateWorkspace(
    args: z.infer<typeof UpdateWorkspaceWithIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.update({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
      name: args.name,
      slug: args.slug,
      description: args.description,
      showEmailsToMembers: args.showEmailsToMembers,
      weekStartDay: args.weekStartDay,
    });
  }

  @Tool({
    name: "delete_workspace",
    description: "Delete a workspace, on behalf of the current user.",
    parameters: WorkspaceIdSchema,
  })
  async deleteWorkspace(
    args: z.infer<typeof WorkspaceIdSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.delete({
      workspacePublicId: args.workspacePublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "search_workspace",
    description: "Search boards and cards in a workspace by title.",
    parameters: SearchWorkspaceSchema,
  })
  async searchWorkspace(
    args: z.infer<typeof SearchWorkspaceSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.workspaceService.search({
      workspacePublicId: args.workspacePublicId,
      query: args.query,
      limit: args.limit,
      userId: user.id,
    });
  }
}
