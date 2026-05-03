import { beforeEach, describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import { boards, cards, lists } from "@kan/db/schema";
import { defaultCardType } from "@kan/shared/constants";

import type { TestDbClient } from "./test-db";
import { createTestDb, seedTestData } from "./test-db";

describe("card type integration tests", () => {
  let db: TestDbClient;
  let user: Awaited<ReturnType<typeof seedTestData>>["user"];
  let workspace: Awaited<ReturnType<typeof seedTestData>>["workspace"];
  let board: typeof boards.$inferSelect;
  let list: typeof lists.$inferSelect;

  beforeEach(async () => {
    db = await createTestDb();
    ({ user, workspace } = await seedTestData(db));

    const [createdBoard] = await db
      .insert(boards)
      .values({
        publicId: "bdtest123456",
        name: "Card Type Board",
        slug: "card-type-board",
        workspaceId: workspace.id,
        createdBy: user.id,
      })
      .returning();

    const [createdList] = await db
      .insert(lists)
      .values({
        publicId: "litest123456",
        name: "To Do",
        index: 0,
        boardId: createdBoard!.id,
        createdBy: user.id,
      })
      .returning();

    board = createdBoard!;
    list = createdList!;
  });

  it("defaults created and bulk-imported cards to Coding", async () => {
    const createdCard = await cardRepo.create(db, {
      title: "Default card",
      description: "",
      createdBy: user.id,
      listId: list.id,
      workspaceId: workspace.id,
      position: "end",
    });

    expect(createdCard.type).toBe(defaultCardType);

    await cardRepo.bulkCreate(db, [
      {
        publicId: "bulkcard0001",
        title: "Imported default card",
        description: "",
        createdBy: user.id,
        listId: list.id,
        workspaceId: workspace.id,
        index: 0,
      },
    ]);

    const importedCard = await db.query.cards.findFirst({
      columns: { type: true },
      where: (card, { eq }) => eq(card.publicId, "bulkcard0001"),
    });

    expect(importedCard?.type).toBe(defaultCardType);
  });

  it("persists, updates, filters, and activity-logs explicit card types", async () => {
    await cardRepo.create(db, {
      title: "Coding card",
      description: "",
      type: "coding",
      createdBy: user.id,
      listId: list.id,
      workspaceId: workspace.id,
      position: "end",
    });

    const bugCard = await cardRepo.create(db, {
      title: "Bug card",
      description: "",
      type: "bug",
      createdBy: user.id,
      listId: list.id,
      workspaceId: workspace.id,
      position: "end",
    });

    const bugOnlyBoard = await boardRepo.getByPublicId(
      db,
      board.publicId,
      user.id,
      {
        members: [],
        labels: [],
        lists: [],
        dueDate: [],
        types: ["bug"],
        type: "regular",
      },
    );

    expect(bugOnlyBoard?.lists[0]?.cards).toHaveLength(1);
    expect(bugOnlyBoard?.lists[0]?.cards[0]?.title).toBe("Bug card");
    expect(bugOnlyBoard?.lists[0]?.cards[0]?.type).toBe("bug");

    const updatedCard = await cardRepo.update(
      db,
      { type: "research" },
      { cardPublicId: bugCard.publicId },
    );

    expect(updatedCard?.type).toBe("research");

    const typeActivity = await cardActivityRepo.create(db, {
      type: "card.updated.type",
      cardId: bugCard.id,
      createdBy: user.id,
      fromCardType: "bug",
      toCardType: "research",
    });

    expect(typeActivity?.id).toBeDefined();

    const activities = await cardActivityRepo.getPaginatedActivities(
      db,
      bugCard.id,
    );
    const loggedTypeActivity = activities.activities.find(
      (activity) => activity.type === "card.updated.type",
    );

    expect(loggedTypeActivity?.fromCardType).toBe("bug");
    expect(loggedTypeActivity?.toCardType).toBe("research");

    const researchOnlyBoard = await boardRepo.getByPublicId(
      db,
      board.publicId,
      user.id,
      {
        members: [],
        labels: [],
        lists: [],
        dueDate: [],
        types: ["research"],
        type: "regular",
      },
    );

    expect(researchOnlyBoard?.lists[0]?.cards).toHaveLength(1);
    expect(researchOnlyBoard?.lists[0]?.cards[0]?.title).toBe("Bug card");
    expect(researchOnlyBoard?.lists[0]?.cards[0]?.type).toBe("research");
  });
});
