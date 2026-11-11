import { Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";

import { BoardService } from "../../board/board.service.js";
import {
  CreateBoardSchema,
  MoveBoardSchema,
  UpdateBoardSchema,
} from "../../board/dto/board.dto.js";
import { WorkspaceService } from "../../workspace/workspace.service.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { Tool } from "../tool.decorator.js";
import { findWorkspaceByName } from "./workspace.tools.js";

const ListBoardsSchema = z.object({
  workspacePublicId: z.string().min(12),
  type: z.enum(["regular", "template"]).optional(),
  archived: z.boolean().optional(),
});

const BoardIdSchema = z.object({ boardPublicId: z.string().min(12) });

const dueDateFilterSchema = z.enum([
  "overdue",
  "today",
  "tomorrow",
  "next-week",
  "next-month",
  "no-due-date",
]);

const GetBoardSchema = BoardIdSchema.extend({
  labelPublicIds: z
    .array(z.string().min(12))
    .optional()
    .describe(
      "Only return cards with any of these labels. Get label public IDs from get_board.",
    ),
  memberPublicIds: z
    .array(z.string().min(12))
    .optional()
    .describe(
      "Only return cards assigned to any of these workspace members. Get their public IDs from get_workspace.",
    ),
  listPublicIds: z
    .array(z.string().min(12))
    .optional()
    .describe("Only return these lists. Get list public IDs from get_board."),
  dueDateFilters: z
    .array(dueDateFilterSchema)
    .optional()
    .describe(
      "Only return cards matching any of these due dates, e.g. ['overdue'] for overdue cards.",
    ),
});

const BoardNameSchema = z.object({
  workspaceName: z
    .string()
    .min(1)
    .describe("Workspace name (case-insensitive)."),
  boardName: z.string().min(1).describe("Board name (case-insensitive)."),
});

const BoardSlugSchema = z.object({
  workspaceSlug: z.string().min(1),
  boardSlug: z.string().min(1).describe("The board's URL slug."),
});

const CreateBoardWithWorkspaceSchema = CreateBoardSchema.extend({
  workspacePublicId: z.string().min(12),
});

const UpdateBoardWithIdSchema = UpdateBoardSchema.extend(BoardIdSchema.shape);

const MoveBoardWithIdSchema = MoveBoardSchema.extend(BoardIdSchema.shape);

type McpRequest = { user?: unknown } | undefined;

@Injectable()
export class BoardTools {
  constructor(
    private readonly boardService: BoardService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Tool({
    name: "list_boards",
    description:
      "List the boards in a workspace that the current user can see. Requires the workspace publicId; use find_workspace_by_name first if you only know its name.",
    parameters: ListBoardsSchema,
  })
  async listBoards(
    args: z.infer<typeof ListBoardsSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.all({ ...args, userId: user.id });
  }

  @Tool({
    name: "get_board",
    description:
      "Get a board with its lists and cards. Optionally filter cards by label, member, list or due date, e.g. dueDateFilters ['overdue'] for overdue cards.",
    parameters: GetBoardSchema,
  })
  async getBoard(
    args: z.infer<typeof GetBoardSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.byId({
      boardPublicId: args.boardPublicId,
      labels: args.labelPublicIds,
      members: args.memberPublicIds,
      lists: args.listPublicIds,
      dueDateFilters: args.dueDateFilters,
      cardView: "full",
      userId: user.id,
    });
  }

  @Tool({
    name: "find_board_by_name",
    description:
      "Find a board by workspace name and board name (both case-insensitive) and return it with its publicId. Use this when you only know names.",
    parameters: BoardNameSchema,
  })
  async findBoardByName(
    args: z.infer<typeof BoardNameSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    const workspace = await findWorkspaceByName(
      this.workspaceService,
      user.id,
      args.workspaceName,
    );
    const boards = await this.boardService.all({
      workspacePublicId: workspace.publicId,
      userId: user.id,
    });
    const board = boards.find(
      (b) => b.name.toLowerCase() === args.boardName.toLowerCase(),
    );
    if (!board)
      throw new NotFoundException(
        `No board named "${args.boardName}" in workspace "${workspace.name}". Available boards: ${boards.map((b) => b.name).join(", ")}`,
      );
    return board;
  }

  @Tool({
    name: "get_board_by_slug",
    description:
      "Get a public board by its workspace slug and board slug, e.g. from a kan.bn/<workspace>/<board> link. Only works for boards with public visibility.",
    parameters: BoardSlugSchema,
  })
  async getBoardBySlug(
    args: z.infer<typeof BoardSlugSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    requireMcpUser(rawRequest);
    return this.boardService.bySlug(args);
  }

  @Tool({
    name: "create_board",
    params: {
      name: "Board name.",
      type: "'regular' to create a board, 'template' to create a board template.",
    },
    description:
      "Create a board in a workspace with initial lists and labels, optionally copying a source board.",
    parameters: CreateBoardWithWorkspaceSchema,
  })
  async createBoard(
    args: z.infer<typeof CreateBoardWithWorkspaceSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.create({ ...args, userId: user.id });
  }

  @Tool({
    name: "update_board",
    params: {
      name: "New board name.",
      slug: "New URL slug for the board.",
    },
    description:
      "Update a board's name, slug, visibility, favourite or archived state.",
    parameters: UpdateBoardWithIdSchema,
  })
  async updateBoard(
    args: z.infer<typeof UpdateBoardWithIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.update({ ...args, userId: user.id });
  }

  @Tool({
    name: "delete_board",
    description: "Delete a board and archive its lists and cards.",
    parameters: BoardIdSchema,
  })
  async deleteBoard(
    args: z.infer<typeof BoardIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.delete({ ...args, userId: user.id });
  }

  @Tool({
    name: "move_board",
    description: "Move a board and its contents to another workspace.",
    parameters: MoveBoardWithIdSchema,
  })
  async moveBoard(
    args: z.infer<typeof MoveBoardWithIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.move({ ...args, userId: user.id });
  }
}
