import { z } from "zod";
import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";

import { BoardMemberService } from "../../board-member/board-member.service.js";
import {
  AddBoardMemberSchema,
  UpdateBoardMemberRoleSchema,
} from "../../board-member/dto/board-member.dto.js";
import { requireMcpUser } from "../mcp-user.util.js";

const ListBoardMembersSchema = z.object({
  boardPublicId: z.string().min(12),
});

const AddBoardMemberWithBoardSchema = AddBoardMemberSchema.extend({
  boardPublicId: z.string().min(12),
});

const UpdateBoardMemberRoleWithIdsSchema = UpdateBoardMemberRoleSchema.extend({
  boardPublicId: z.string().min(12),
  workspaceMemberPublicId: z.string().min(12),
});

const RemoveBoardMemberSchema = z.object({
  boardPublicId: z.string().min(12),
  workspaceMemberPublicId: z.string().min(12),
});

@Injectable()
export class BoardMemberTools {
  constructor(private readonly boardMemberService: BoardMemberService) {}

  @Tool({
    name: "list_board_members",
    description: "List a board's members, on behalf of the current user.",
    parameters: ListBoardMembersSchema,
  })
  async listBoardMembers(
    args: z.infer<typeof ListBoardMembersSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardMemberService.all({
      boardPublicId: args.boardPublicId,
      userId: user.id,
    });
  }

  @Tool({
    name: "add_board_member",
    description:
      "Add a workspace member to a board, on behalf of the current user.",
    parameters: AddBoardMemberWithBoardSchema,
  })
  async addBoardMember(
    args: z.infer<typeof AddBoardMemberWithBoardSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardMemberService.add({
      boardPublicId: args.boardPublicId,
      workspaceMemberPublicId: args.workspaceMemberPublicId,
      role: args.role,
      userId: user.id,
    });
  }

  @Tool({
    name: "update_board_member_role",
    description:
      "Update a board member's role, on behalf of the current user.",
    parameters: UpdateBoardMemberRoleWithIdsSchema,
  })
  async updateBoardMemberRole(
    args: z.infer<typeof UpdateBoardMemberRoleWithIdsSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardMemberService.updateRole({
      boardPublicId: args.boardPublicId,
      workspaceMemberPublicId: args.workspaceMemberPublicId,
      role: args.role,
      userId: user.id,
    });
  }

  @Tool({
    name: "remove_board_member",
    description: "Remove a member from a board, on behalf of the current user.",
    parameters: RemoveBoardMemberSchema,
  })
  async removeBoardMember(
    args: z.infer<typeof RemoveBoardMemberSchema>,
    _context: unknown,
    rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardMemberService.remove({
      boardPublicId: args.boardPublicId,
      workspaceMemberPublicId: args.workspaceMemberPublicId,
      userId: user.id,
    });
  }
}
