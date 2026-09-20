import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a list's vertical scroll position is restored after opening a card",
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
    await board.createList("Long list");

    const cardTitle = "Card at the bottom";
    for (let index = 0; index < 12; index += 1) {
      await board.createCard(index === 0 ? cardTitle : `Card ${index + 1}`);
    }

    const listScroll = page.locator("[data-list-scroll-id]").first();
    const initialScrollTop = await listScroll.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return element.scrollTop;
    });
    expect(initialScrollTop).toBeGreaterThan(0);
    await expect(page.getByText(cardTitle, { exact: true })).toBeVisible();

    await board.openCard(cardTitle);
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL(/\/boards\/[^/]+$/);

    await expect
      .poll(async () =>
        Math.abs(
          (await listScroll.evaluate((element) => element.scrollTop)) -
            initialScrollTop,
        ),
      )
      .toBeLessThanOrEqual(2);

    await board.openCard(cardTitle);
    await page.goBack();
    await page.waitForURL(/\/boards\/[^/]+$/);

    await expect
      .poll(async () =>
        Math.abs(
          (await listScroll.evaluate((element) => element.scrollTop)) -
            initialScrollTop,
        ),
      )
      .toBeLessThanOrEqual(2);
  },
);

test(
  "the board's horizontal scroll position is restored after opening a card",
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
    for (let index = 1; index <= 6; index += 1) {
      await board.createList(`List ${index}`);
    }

    const cardTitle = "Card in the last list";
    await board.createCard(cardTitle, "List 6");

    const boardScroll = page.locator("div.overflow-x-scroll").first();
    const initialScrollLeft = await boardScroll.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      return element.scrollLeft;
    });
    expect(initialScrollLeft).toBeGreaterThan(0);
    await expect(page.getByText(cardTitle, { exact: true })).toBeVisible();

    await board.openCard(cardTitle);
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL(/\/boards\/[^/]+$/);

    await expect
      .poll(async () =>
        Math.abs(
          (await boardScroll.evaluate((element) => element.scrollLeft)) -
            initialScrollLeft,
        ),
      )
      .toBeLessThanOrEqual(2);
  },
);
