import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { createDrizzleClient } from "@kan/db/client";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import { cardActivities, comments } from "@kan/db/schema";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

const activityOrderKey = "kan_activity-sort-order";

async function verticalPosition(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected the element to have a bounding box");

  return box.y;
}

async function seedComments(
  cardPublicId: string,
  authorEmail: string,
  count: number,
) {
  const db = createDrizzleClient();
  const card = await cardRepo.getByPublicId(db, cardPublicId);
  const author = await userRepo.getByEmail(db, authorEmail);

  if (!card || !author) throw new Error("Could not resolve seeded card data");

  const seed = crypto.randomUUID().replaceAll("-", "").slice(0, 5);
  const createdAt = new Date(Date.now() - count);
  const commentRows = Array.from({ length: count }, (_, index) => ({
    publicId: `${seed}c${String(index).padStart(6, "0")}`,
    comment: `<p>Activity comment ${String(index + 1).padStart(2, "0")}</p>`,
    cardId: card.id,
    createdBy: author.id,
    createdAt: new Date(createdAt.getTime() + index),
  }));

  const insertedComments = await db
    .insert(comments)
    .values(commentRows)
    .returning({
      id: comments.id,
      publicId: comments.publicId,
      comment: comments.comment,
      createdAt: comments.createdAt,
    });

  await db.insert(cardActivities).values(
    insertedComments.map((comment) => ({
      publicId: `${comment.publicId.slice(0, 5)}a${comment.publicId.slice(6)}`,
      type: "card.updated.comment.added" as const,
      cardId: card.id,
      commentId: comment.id,
      toComment: comment.comment,
      createdBy: author.id,
      createdAt: comment.createdAt,
    })),
  );
}

test(
  "card activity order persists and keeps new comments visible across pagination",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("Activity Order E2E Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("Activity Order E2E Board");
    await board.createList("To do");
    await board.createCard("Activity order test card");
    await board.openCard("Activity order test card");

    const cardPublicId = page.url().split("/cards/")[1];
    if (!cardPublicId) throw new Error("Could not resolve cardPublicId");

    await seedComments(cardPublicId, user.email, 21);
    await page.reload();

    const firstComment = page.getByText("Activity comment 01", {
      exact: true,
    });
    const newestComment = page.getByText("Activity comment 21", {
      exact: true,
    });
    const loadMore = page.getByRole("button", {
      name: "Load more activities",
    });
    const commentForm = page
      .getByRole("button", { name: "Submit comment" })
      .locator("xpath=ancestor::form");

    await expect(firstComment).toBeVisible();
    await expect(newestComment).toHaveCount(0);
    await expect(loadMore).toBeVisible();
    expect(await verticalPosition(commentForm)).toBeGreaterThan(
      await verticalPosition(loadMore),
    );

    await page
      .getByRole("button", { name: "Show newest activity first" })
      .click();

    await expect(newestComment).toBeVisible();
    await expect(firstComment).toHaveCount(0);
    expect(await verticalPosition(commentForm)).toBeLessThan(
      await verticalPosition(newestComment),
    );
    expect(
      await page.evaluate((key) => localStorage.getItem(key), activityOrderKey),
    ).toBe("newest");

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Show oldest activity first" }),
    ).toBeVisible();
    await expect(newestComment).toBeVisible();

    await page.goto("/settings/account");
    const setting = page.locator("#activity-sort-order-select");
    await expect(setting).toHaveValue("newest");
    await setting.selectOption("oldest");

    await page.goto(`/cards/${cardPublicId}`);
    await expect(
      page.getByRole("button", { name: "Show newest activity first" }),
    ).toBeVisible();
    await expect(firstComment).toBeVisible();
    await expect(newestComment).toHaveCount(0);

    await card.addComment("Fresh comment after the page boundary");
    const freshComment = page.getByText(
      "Fresh comment after the page boundary",
      { exact: true },
    );
    await expect(loadMore).toBeVisible();
    await expect(freshComment).toBeVisible();
    expect(await verticalPosition(freshComment)).toBeGreaterThan(
      await verticalPosition(loadMore),
    );
    expect(await verticalPosition(commentForm)).toBeGreaterThan(
      await verticalPosition(freshComment),
    );
  },
);
