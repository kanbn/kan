import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "the board view can be filtered by label",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("E2E Test Board");
    await board.createList("To do");
    await board.createCard("Labeled card");
    await board.createCard("Unlabeled card");

    await board.openCard("Labeled card");
    await card.createAndAssignLabel("Urgent");
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL(/\/boards\/[^/]+$/);

    await expect(page.getByText("Labeled card", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Unlabeled card", { exact: true }),
    ).toBeVisible();

    await board.filterByLabel("Urgent");

    await expect(page.getByText("Labeled card", { exact: true })).toBeVisible();
    await expect(page.getByText("Unlabeled card", { exact: true })).toHaveCount(
      0,
    );

    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();

    await expect(page.getByText("Labeled card", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Unlabeled card", { exact: true }),
    ).toBeVisible();
  },
);
