import { Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";

import {
  CheckSlugAvailabilityQuerySchema,
  CreateWorkspaceSchema,
  SearchQuerySchema,
  UpdateWorkspaceSchema,
} from "../../workspace/dto/workspace.dto.js";
import { WorkspaceService } from "../../workspace/workspace.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { Tool } from "../tool.decorator.js";

const WorkspaceIdSchema = z.object({
  workspacePublicId: z.string().min(12),
});

const WorkspaceNameSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Workspace name to look up (case-insensitive)."),
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

export async function findWorkspaceByName(
  workspaceService: WorkspaceService,
  userId: string,
  name: string,
) {
  const workspaces = (await workspaceService.all({ userId })).map(
    (membership) => membership.workspace,
  );
  const match = workspaces.find(
    (workspace) => workspace.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match)
    throw new NotFoundException(
      `No workspace named "${name}". Available workspaces: ${workspaces.map((w) => w.name).join(", ")}`,
    );
  return match;
}

@Injectable()
export class WorkspaceTools {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Tool({
    name: "list_workspaces",
    description:
      "List all workspaces the current user belongs to. Call this first to resolve a workspace name to its publicId before calling any other workspace-scoped tool.",
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
    name: "find_workspace_by_name",
    description:
      "Find a workspace by its name (case-insensitive) and return it with its publicId. Use this whenever you only know the workspace name.",
    parameters: WorkspaceNameSchema,
  })
  async findWorkspaceByName(
    args: z.infer<typeof WorkspaceNameSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return findWorkspaceByName(this.workspaceService, user.id, args.name);
  }

  @Tool({
    name: "check_workspace_slug_availability",
    params: {
      workspaceSlug: "The slug to check.",
    },
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
    params: {
      name: "Workspace name.",
      description: "Short description of the workspace.",
      slug: "URL slug for the workspace (letters, numbers, hyphens). Generated from the name if omitted.",
    },
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
    params: {
      name: "New workspace name.",
      description: "New workspace description.",
      slug: "New URL slug for the workspace.",
    },
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
