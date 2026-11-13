import { UseFilters } from "@nestjs/common";
import { Ctx, Payload } from "@nestjs/microservices";
import {
  McpController,
  McpExceptionFilter,
  McpRawRequest,
  Tool,
} from "@rekog/mcp-nest";
import { z } from "zod";

import { BoardMemberService } from "../../board-member/board-member.service.js";
import {
  AddBoardMemberSchema,
  UpdateBoardMemberRoleSchema,
} from "../../board-member/dto/board-member.dto.js";
import { requireMcpUser } from "../mcp-user.util.js";
import { boardPublicId, workspaceMemberPublicId } from "./public-ids.js";

const ListBoardMembersSchema = z.object({
  boardPublicId,
});

const AddBoardMemberWithBoardSchema = AddBoardMemberSchema.extend({
  boardPublicId,
});

const UpdateBoardMemberRoleWithIdsSchema = UpdateBoardMemberRoleSchema.extend({
  boardPublicId,
  workspaceMemberPublicId,
});

const RemoveBoardMemberSchema = z.object({
  boardPublicId,
  workspaceMemberPublicId,
});

@UseFilters(McpExceptionFilter)
@McpController()
export class BoardMemberTools {
  constructor(private readonly boardMemberService: BoardMemberService) {}

  @Tool({
    name: "list_board_members",
    description: "List a board's members, on behalf of the current user.",
    parameters: ListBoardMembersSchema,
  })
  async listBoardMembers(
    @Payload() args: z.infer<typeof ListBoardMembersSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
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
    @Payload() args: z.infer<typeof AddBoardMemberWithBoardSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
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
    description: "Update a board member's role, on behalf of the current user.",
    parameters: UpdateBoardMemberRoleWithIdsSchema,
  })
  async updateBoardMemberRole(
    @Payload() args: z.infer<typeof UpdateBoardMemberRoleWithIdsSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
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
    @Payload() args: z.infer<typeof RemoveBoardMemberSchema>,
    @Ctx() _context: unknown,
    @McpRawRequest() rawRequest: { user?: unknown } | undefined,
  ) {
    const user = requireMcpUser(rawRequest);
    return this.boardMemberService.remove({
      boardPublicId: args.boardPublicId,
      workspaceMemberPublicId: args.workspaceMemberPublicId,
      userId: user.id,
    });
  }
}
