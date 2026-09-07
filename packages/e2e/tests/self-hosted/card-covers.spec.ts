import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coverFixture = path.join(
  __dirname,
  "../../../../apps/web/public/icon-512.png",
);

test(
  "an image cover renders on a card and respects the saved display preference",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);
    const settings = new SettingsPage(page);
    const cardTitle = "Image cover test card";

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("Image Cover Test Board");
    await board.createList("To do");
    await board.createCard(cardTitle);
    const boardUrl = page.url();
    await board.openCard(cardTitle);

    await card.uploadCover(coverFixture);
    await expect(page.locator('img[sizes*="800px"]')).toBeVisible();
    await card.setCoverSize("Full");
    await card.closeCoverSelector();
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL(boardUrl);

    const boardCard = page
      .locator('a[href^="/cards/"]')
      .filter({ has: page.getByText(cardTitle, { exact: true }) });
    await boardCard.scrollIntoViewIfNeeded();
    await expect(boardCard.locator("img")).toBeVisible();
    await expect(boardCard.locator(":scope > div")).toHaveClass(/min-h-40/);

    await settings.open();
    await settings.setCardCoverDisplay("hidden");
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("kan_card-cover-display")),
      )
      .toBe("hidden");
    await page.reload();
    await settings.expectCardCoverDisplay("hidden");

    let coverUrlRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/trpc/board.coverUrls")) {
        coverUrlRequests += 1;
      }
    });

    await page.goto(boardUrl);
    await expect(page.getByText(cardTitle, { exact: true })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(boardCard.locator("img")).toHaveCount(0);
    expect(coverUrlRequests).toBe(0);
  },
);
