import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForApi } from "../support/wait-for-api";

// Menu items are found by position: new text isn't translated until it's merged.
async function archiveOpenCard(page: Page) {
  await page.getByRole("button", { name: "Card options", exact: true }).click();
  const archived = waitForApi(page, "POST", /^\/cards\/[^/]+\/archive$/);
  await page.getByRole("menuitem").nth(-2).click();
  await archived;
}

test(
  "a card can be archived, unarchived and deleted from the archive",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const board = new BoardPage(page);

    await new AuthPage(page).signUp(user);
    await new SelfHostedOnboardingPage(page).createFirstWorkspace(
      "E2E Test Workspace",
    );
    await new DashboardPage(page).expectSignedInAs(user);

    await board.createBoard("E2E Test Board");
    await board.createList("To do");
    await board.createCard("Archive me", "To do");
    await board.createCard("Keep me", "To do");
    const boardUrl = page.url();
    const archiveUrl = `${boardUrl.split("?")[0]}/archived`;
    const row = page.getByRole("row", { name: /Archive me/ });
    const openRowMenu = async () => {
      await row.hover();
      await row.getByRole("button", { name: "Card options" }).click();
    };

    await board.openCard("Archive me");
    await archiveOpenCard(page);

    await page.goto(boardUrl);
    await expect(page.getByText("Keep me")).toBeVisible();
    await expect(page.getByText("Archive me")).toHaveCount(0);

    await page.goto(archiveUrl);
    await openRowMenu();
    const unarchived = waitForApi(page, "POST", /^\/cards\/[^/]+\/unarchive$/);
    await page.getByRole("menuitem").first().click();
    await unarchived;
    await expect(row).toHaveCount(0);

    await page.goto(boardUrl);
    await board.openCard("Archive me");
    await archiveOpenCard(page);

    await page.goto(archiveUrl);
    await openRowMenu();
    await page.getByRole("menuitem", { name: "Delete card" }).click();
    const deleted = waitForApi(page, "DELETE", /^\/cards\/[^/]+$/);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await deleted;
    await expect(row).toHaveCount(0);

    await page.goto(boardUrl);
    await expect(page.getByText("Keep me")).toBeVisible();
    await expect(page.getByText("Archive me")).toHaveCount(0);
  },
);
