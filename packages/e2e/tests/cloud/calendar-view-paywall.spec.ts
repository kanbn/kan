import { expect, test } from "@playwright/test";

import { setWorkspacePlan } from "../support/db-client";
import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CalendarPage } from "../support/pages/calendar-page";
import { CardPage } from "../support/pages/card-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { createTestUser } from "../support/test-user";

test(
  "the calendar view is locked behind an upgrade prompt on the free plan",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);
    const calendar = new CalendarPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Calendar Free Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    await board.createBoard("Calendar Paywall Board");
    await board.createList("To do");
    await board.createCard("Due today");
    await board.openCard("Due today");
    await card.setDueDateToday();
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL((url) => /^\/boards\/[^/]+$/.test(url.pathname));

    await calendar.open();
    await calendar.expectLocked();

    const upgradeHref = await page
      .getByRole("link", { name: "Upgrade", exact: true })
      .getAttribute("href");
    expect(upgradeHref).toContain("/upgrade/select-plan");
    expect(upgradeHref).toContain(`workspacePublicId=${workspacePublicId}`);
  },
);

test(
  "the calendar view is fully usable on a paid plan",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);
    const calendar = new CalendarPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Calendar Paid Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    await board.createBoard("Calendar Paid Board");
    await board.createList("To do");
    await board.createCard("Due today");
    await board.openCard("Due today");
    await card.setDueDateToday();
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL((url) => /^\/boards\/[^/]+$/.test(url.pathname));

    await setWorkspacePlan(workspacePublicId, "team");
    await page.reload();

    await calendar.open();
    await calendar.expectUnlocked();
    await calendar.expectCardOnDate("Due today", new Date());

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() <= 15 ? 20 : 10);
    await calendar.createCardOnDate(targetDate, "Scheduled card");
    await calendar.expectCardOnDate("Scheduled card", targetDate);
  },
);
