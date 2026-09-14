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
    await expect(page.getByRole("menu")).toHaveCount(0);

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(
      page.getByRole("menuitem", { name: "Labels 1", exact: true }),
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "Labels 1", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Urgent", exact: true }),
    ).toBeChecked();

    await page
      .getByRole("menuitem", { name: "Clear filters", exact: true })
      .click();

    await expect(page.getByText("Labeled card", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Unlabeled card", { exact: true }),
    ).toBeVisible();
  },
);

test(
  "closing a card preserves the board label filter",
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

    await board.createBoard("Filtered board");
    await board.createList("To do");
    await board.createCard("Matching card");
    await board.createCard("Nonmatching card");

    await page.getByText("Matching card", { exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/cards/"));
    const labelPublicId = await card.createAndAssignLabel("Urgent");
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL((url) => /^\/boards\/[^/]+$/.test(url.pathname));

    await board.filterByLabel("Urgent");
    const expectedBoardUrl = new URL(page.url());
    expectedBoardUrl.search = new URLSearchParams({
      labels: labelPublicId,
    }).toString();

    await expect(page).toHaveURL(expectedBoardUrl.toString());
    await expect(
      page.getByText("Matching card", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Nonmatching card", { exact: true }),
    ).toHaveCount(0);

    await page.getByText("Matching card", { exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/cards/"));
    expect(new URL(page.url()).searchParams.get("returnUrl")).toBe(
      `${expectedBoardUrl.pathname}${expectedBoardUrl.search}`,
    );
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL(expectedBoardUrl.toString());

    await expect(
      page.getByText("Matching card", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Nonmatching card", { exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(
      page.getByRole("menuitem", { name: "Labels 1", exact: true }),
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "Labels 1", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "Urgent", exact: true }),
    ).toBeChecked();
  },
);

test(
  "closing a directly opened card returns to the plain board",
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

    await board.createBoard("Direct card board");
    await board.createList("To do");
    await board.createCard("Direct card");

    const cardHref = await page
      .getByRole("link", { name: "Direct card", exact: true })
      .getAttribute("href");
    expect(cardHref).toMatch(/^\/cards\/[^?]+$/);
    await page.goto(cardHref as string);
    await page.waitForURL((url) => url.pathname.startsWith("/cards/"));
    await page.getByRole("link", { name: "Close" }).click();

    await page.waitForURL((url) => /^\/boards\/[^/]+$/.test(url.pathname));
    expect(new URL(page.url()).search).toBe("");
  },
);
