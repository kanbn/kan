import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

async function openSearch(page: Page) {
  await page.getByRole("button", { name: "Search", exact: true }).click();
  return page.getByPlaceholder("Search boards and cards...");
}

test(
  "boards and cards can be found via the command palette search",
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

    await board.createBoard("Findable Board Xyzzy");
    await board.createList("To do");
    await board.createCard("Locatable Card Plugh");

    const boardSearchInput = await openSearch(page);
    await boardSearchInput.fill("Findable Board");
    const boardOption = page.getByRole("option", { name: /Findable Board/ });
    await expect(boardOption).toBeVisible();
    await boardOption.click();
    await page.waitForURL(/\/boards\/[^/]+$/);

    const cardSearchInput = await openSearch(page);
    await cardSearchInput.fill("Locatable Card");
    const cardOption = page.getByRole("option", {
      name: /Locatable Card Plugh/,
    });
    await expect(cardOption).toBeVisible();
    await cardOption.click();
    await page.waitForURL(/\/cards\/[^/]+$/);

    const noResultsSearchInput = await openSearch(page);
    await noResultsSearchInput.fill("zzz-no-such-thing-zzz");
    await expect(
      page.getByText('No results found for "zzz-no-such-thing-zzz".'),
    ).toBeVisible();
  },
);
