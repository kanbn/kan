import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a list can be renamed, then deleted along with its cards",
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

    await board.createBoard("E2E Test Board");
    await board.createList("Original list name");
    await board.createCard("E2E Test Card");

    await board.renameList("Renamed list");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "List name" })).toHaveValue(
      "Renamed list",
    );

    await board.deleteList();
    await expect(page.getByRole("textbox", { name: "List name" })).toHaveCount(
      0,
    );
    await expect(page.getByText("E2E Test Card")).toHaveCount(0);
  },
);
