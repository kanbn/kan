import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto, ZodResponse } from "nestjs-zod";
import { z } from "zod";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as cardCommentRepo from "@kan/db/repository/cardComment.repo";
import * as checklistRepo from "@kan/db/repository/checklist.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as inviteLinkRepo from "@kan/db/repository/inviteLink.repo";
import * as labelRepo from "@kan/db/repository/label.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { AdminKeyGuard } from "../../common/guards/admin-key.guard.js";
import { db } from "../../common/session.util.js";

export const StatsSchema = z.object({
  users: z.number(),
  workspaces: z.number(),
  boards: z.number(),
  lists: z.number(),
  cards: z.number(),
  cardComments: z.number(),
  cardAttachments: z.number(),
  cardActivityLogs: z.number(),
  labels: z.number(),
  checklists: z.number(),
  checklistItems: z.number(),
  activeMembers: z.number(),
  activeInviteLinks: z.number(),
  imports: z.number(),
});

export class StatsDto extends createZodDto(StatsSchema) {}

const counts = {
  users: (d) => userRepo.getCount(d),
  workspaces: (d) => workspaceRepo.getCount(d),
  boards: (d) => boardRepo.getCount(d),
  lists: (d) => listRepo.getCount(d),
  cards: (d) => cardRepo.getCount(d),
  cardComments: (d) => cardCommentRepo.getCount(d),
  cardAttachments: (d) => cardAttachmentRepo.getCount(d),
  cardActivityLogs: (d) => cardActivityRepo.getCount(d),
  labels: (d) => labelRepo.getCount(d),
  checklists: (d) => checklistRepo.getCount(d),
  checklistItems: (d) => checklistRepo.getCountItems(d),
  activeMembers: (d) => memberRepo.getActiveCount(d),
  activeInviteLinks: (d) => inviteLinkRepo.getActiveCount(d),
  imports: (d) => importRepo.getCount(d),
} satisfies Record<keyof StatsDto, (database: typeof db) => Promise<number>>;

@ApiTags("Health")
@ApiHeader({ name: "x-admin-api-key", required: true })
@UseGuards(AdminKeyGuard)
@Controller("stats")
export class StatsController {
  @Get()
  @ApiOperation({
    operationId: "getStats",
    summary: "Instance-wide counts of users, workspaces, boards, cards, etc.",
  })
  @ZodResponse({ status: 200, type: StatsDto })
  async stats() {
    const result = {} as Record<keyof typeof counts, number>;
    await Promise.all(
      (Object.keys(counts) as (keyof typeof counts)[]).map(async (key) => {
        result[key] = await counts[key](db);
      }),
    );
    return result;
  }
}
