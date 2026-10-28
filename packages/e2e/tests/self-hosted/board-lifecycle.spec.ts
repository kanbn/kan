import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a board can be renamed, archived, and deleted",
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

    await board.createBoard("Original board name");
    await board.renameBoard("Renamed board");
    await board.archiveBoard();

    await page.goto("/boards");
    await page.getByRole("button", { name: "Archived" }).click();
    await expect(page.getByText("Renamed board")).toBeVisible();

    await page.getByText("Renamed board").click();
    await page.waitForURL(/\/boards\/[^/]+$/);
    await board.deleteBoard();

    await page.getByRole("button", { name: "Archived" }).click();
    await expect(page.getByText("Renamed board")).toHaveCount(0);
  },
);
