import { beforeEach, describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import {
  boards,
  cardAttachments,
  cards,
  checklistItems,
  checklists,
  comments,
  lists,
} from "@kan/db/schema";

import type { TestDbClient } from "./test-db";
import { boardDetailSchema } from "../src/schemas/board";
import { createTestDb, seedTestData } from "./test-db";

describe("board summary repository view", () => {
  let db: TestDbClient;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDb();
    const { user, workspace } = await seedTestData(db);
    userId = user.id;

    const [board] = await db
      .insert(boards)
      .values({
        publicId: "board1234567",
        name: "Summary board",
        slug: "summary-board",
        workspaceId: workspace.id,
        createdBy: user.id,
      })
      .returning();
    const [list] = await db
      .insert(lists)
      .values({
        publicId: "list12345678",
        name: "Todo",
        index: 0,
        boardId: board!.id,
        createdBy: user.id,
      })
      .returning();
    const [card] = await db
      .insert(cards)
      .values({
        publicId: "card12345678",
        title: "Summarise me",
        description: "<p>Visible details</p>",
        index: 0,
        listId: list!.id,
        createdBy: user.id,
      })
      .returning();
    await db.insert(cards).values({
      publicId: "empty1234567",
      title: "Empty summary",
      description: null,
      index: 1,
      listId: list!.id,
      createdBy: user.id,
    });
    const [checklist] = await db
      .insert(checklists)
      .values({
        publicId: "check1234567",
        name: "Checklist",
        index: 0,
        cardId: card!.id,
        createdBy: user.id,
      })
      .returning();

    await db.insert(checklistItems).values([
      {
        publicId: "item12345678",
        title: "Complete",
        completed: true,
        index: 0,
        checklistId: checklist!.id,
        createdBy: user.id,
      },
      {
        publicId: "item23456789",
        title: "Open",
        completed: false,
        index: 1,
        checklistId: checklist!.id,
        createdBy: user.id,
      },
      {
        publicId: "item34567890",
        title: "Deleted",
        completed: true,
        index: 2,
        checklistId: checklist!.id,
        createdBy: user.id,
        deletedAt: new Date(),
      },
    ]);
    await db.insert(cardAttachments).values([
      {
        publicId: "attach123456",
        cardId: card!.id,
        filename: "active.txt",
        originalFilename: "active.txt",
        contentType: "text/plain",
        size: 1,
        s3Key: "active.txt",
        createdBy: user.id,
      },
      {
        publicId: "attach234567",
        cardId: card!.id,
        filename: "deleted.txt",
        originalFilename: "deleted.txt",
        contentType: "text/plain",
        size: 1,
        s3Key: "deleted.txt",
        createdBy: user.id,
        deletedAt: new Date(),
      },
    ]);
    await db.insert(comments).values([
      {
        publicId: "comment12345",
        comment: "Active comment",
        cardId: card!.id,
        createdBy: user.id,
      },
      {
        publicId: "comment23456",
        comment: "Deleted comment",
        cardId: card!.id,
        createdBy: user.id,
        deletedAt: new Date(),
      },
    ]);
  });

  it("returns matching full details and compact aggregates", async () => {
    const filters = {
      members: [],
      labels: [],
      lists: [],
      dueDate: [],
      type: "regular" as const,
    };
    const full = await boardRepo.getByPublicId(db, "board1234567", userId, {
      ...filters,
      cardView: "full",
    });
    const summary = await boardRepo.getByPublicId(db, "board1234567", userId, {
      ...filters,
      cardView: "summary",
    });
    const fullCard = full?.lists[0]?.cards[0];
    const summaryCard = summary?.lists[0]?.cards[0];
    const emptySummaryCard = summary?.lists[0]?.cards[1];

    expect(fullCard).toMatchObject({
      description: "<p>Visible details</p>",
      attachments: [{ publicId: "attach123456" }],
      comments: [{ publicId: "comment12345" }],
    });
    expect(fullCard?.checklists[0]?.items).toHaveLength(2);
    expect(fullCard?.summary).toBeUndefined();
    expect(summaryCard).toMatchObject({
      description: null,
      attachments: [],
      comments: [],
      checklists: [],
      summary: {
        hasDescription: true,
        attachmentCount: 1,
        hasComments: true,
        checklistItemCount: 2,
        completedChecklistItemCount: 1,
      },
    });
    expect(emptySummaryCard).toMatchObject({
      description: null,
      attachments: [],
      comments: [],
      checklists: [],
      summary: {
        hasDescription: false,
        attachmentCount: 0,
        hasComments: false,
        checklistItemCount: 0,
        completedChecklistItemCount: 0,
      },
    });

    expect(() => boardDetailSchema.parse(full)).not.toThrow();
    expect(() => boardDetailSchema.parse(summary)).not.toThrow();
  });
});
