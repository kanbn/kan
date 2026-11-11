import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";
import { z } from "zod";

import { BoardService } from "../../board/board.service.js";
import {
  CreateBoardSchema,
  MoveBoardSchema,
  UpdateBoardSchema,
} from "../../board/dto/board.dto.js";
import { requireMcpUser } from "../mcp-user.util.js";

const ListBoardsSchema = z.object({
  workspacePublicId: z.string().min(12),
  type: z.enum(["regular", "template"]).optional(),
  archived: z.boolean().optional(),
});

const BoardIdSchema = z.object({ boardPublicId: z.string().min(12) });

const CreateBoardWithWorkspaceSchema = CreateBoardSchema.extend({
  workspacePublicId: z.string().min(12),
});

const UpdateBoardWithIdSchema = UpdateBoardSchema.extend(BoardIdSchema.shape);

const MoveBoardWithIdSchema = MoveBoardSchema.extend(BoardIdSchema.shape);

type McpRequest = { user?: unknown } | undefined;

@Injectable()
export class BoardTools {
  constructor(private readonly boardService: BoardService) {}

  @Tool({
    name: "list_boards",
    description:
      "List the boards in a workspace that the current user can see.",
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
    description: "Get a board with its lists and cards.",
    parameters: BoardIdSchema,
  })
  async getBoard(
    args: z.infer<typeof BoardIdSchema>,
    _context: unknown,
    rawRequest: McpRequest,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardService.byId({
      boardPublicId: args.boardPublicId,
      cardView: "full",
      userId: user.id,
    });
  }

  @Tool({
    name: "create_board",
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
