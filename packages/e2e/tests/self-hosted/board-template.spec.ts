import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a board can be saved as a template",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("Board To Templatize");
    await board.createList("To do");

    await board.makeTemplate();

    await page.goto("/templates");
    await expect(
      page.getByText("Board To Templatize", { exact: true }),
    ).toBeVisible();
  },
);

test(
  "deleting a card on a template returns to the template",
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

    await board.createBoard("Board To Templatize");
    await board.createList("To do");
    await board.makeTemplate();
    const templateUrl = page.url();

    await board.createCard("Template Card");
    await board.openCard("Template Card");
    await card.delete();

    await page.waitForURL(templateUrl);
    await expect(page.getByText("Template Card", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole("textbox", { name: "List name" })).toHaveValue(
      "To do",
    );
    await expect(page).toHaveURL(templateUrl);
  },
);
