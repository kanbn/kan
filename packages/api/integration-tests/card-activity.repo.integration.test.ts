import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import { boards, cardActivities, cards, comments, lists } from "@kan/db/schema";

import { createTestDb, seedTestData } from "./test-db";

describe("card activity repository", () => {
  it("paginates both orders and excludes deleted comments", async () => {
    const db = await createTestDb();
    const { user, workspace } = await seedTestData(db);

    const [board] = await db
      .insert(boards)
      .values({
        publicId: "board1234567",
        name: "Test board",
        slug: "test-board",
        createdBy: user.id,
        workspaceId: workspace.id,
      })
      .returning();
    const [list] = await db
      .insert(lists)
      .values({
        publicId: "list12345678",
        name: "Test list",
        index: 1,
        createdBy: user.id,
        boardId: board!.id,
      })
      .returning();
    const [card] = await db
      .insert(cards)
      .values({
        publicId: "card12345678",
        title: "Test card",
        index: 1,
        createdBy: user.id,
        listId: list!.id,
      })
      .returning();

    const firstTimestamp = new Date("2026-09-06T10:00:00.000Z");
    await db.insert(cardActivities).values([
      {
        publicId: "activity0001",
        type: "card.created",
        cardId: card!.id,
        createdBy: user.id,
        createdAt: firstTimestamp,
      },
      {
        publicId: "activity0002",
        type: "card.updated.title",
        cardId: card!.id,
        createdBy: user.id,
        createdAt: firstTimestamp,
      },
      {
        publicId: "activity0003",
        type: "card.updated.title",
        cardId: card!.id,
        createdBy: user.id,
        createdAt: new Date("2026-09-06T11:00:00.000Z"),
      },
      {
        publicId: "activity0004",
        type: "card.updated.title",
        cardId: card!.id,
        createdBy: user.id,
        createdAt: new Date("2026-09-06T12:00:00.000Z"),
      },
    ]);
    await db
      .update(cardActivities)
      .set({ createdAt: sql`timestamp '2026-09-06 10:00:00.123111'` })
      .where(eq(cardActivities.publicId, "activity0001"));
    await db
      .update(cardActivities)
      .set({ createdAt: sql`timestamp '2026-09-06 10:00:00.123222'` })
      .where(eq(cardActivities.publicId, "activity0002"));

    const oldestFirstPage = await cardActivityRepo.getPaginatedActivities(
      db,
      card!.id,
      { limit: 2, order: "oldest" },
    );
    const oldestSecondPage = await cardActivityRepo.getPaginatedActivities(
      db,
      card!.id,
      {
        limit: 2,
        order: "oldest",
        cursor: oldestFirstPage.nextCursor,
      },
    );

    expect(
      [...oldestFirstPage.activities, ...oldestSecondPage.activities].map(
        ({ publicId }) => publicId,
      ),
    ).toEqual(["activity0001", "activity0002", "activity0003", "activity0004"]);
    expect(oldestSecondPage.hasMore).toBe(false);

    const newestFirstPage = await cardActivityRepo.getPaginatedActivities(
      db,
      card!.id,
      { limit: 2, order: "newest" },
    );
    const newestSecondPage = await cardActivityRepo.getPaginatedActivities(
      db,
      card!.id,
      {
        limit: 2,
        order: "newest",
        cursor: newestFirstPage.nextCursor,
      },
    );

    expect(
      [...newestFirstPage.activities, ...newestSecondPage.activities].map(
        ({ publicId }) => publicId,
      ),
    ).toEqual(["activity0004", "activity0003", "activity0002", "activity0001"]);
    expect(newestSecondPage.hasMore).toBe(false);

    const [deletedComment] = await db
      .insert(comments)
      .values({
        publicId: "comment00001",
        comment: "Deleted comment",
        cardId: card!.id,
        createdBy: user.id,
        deletedAt: new Date("2026-09-06T13:00:00.000Z"),
        deletedBy: user.id,
      })
      .returning();
    await db.insert(cardActivities).values({
      publicId: "activity0005",
      type: "card.updated.comment.added",
      cardId: card!.id,
      commentId: deletedComment!.id,
      createdBy: user.id,
      createdAt: new Date("2026-09-06T13:00:00.000Z"),
    });

    const activitiesWithoutDeletedComment =
      await cardActivityRepo.getPaginatedActivities(db, card!.id, {
        limit: 10,
        order: "newest",
      });

    expect(
      activitiesWithoutDeletedComment.activities.map(
        ({ publicId }) => publicId,
      ),
    ).toEqual(["activity0004", "activity0003", "activity0002", "activity0001"]);
  });
});
