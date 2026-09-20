import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CalendarPage, toDateKey } from "../support/pages/calendar-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "the calendar view shows cards on their due date and hides cards without one",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);
    const calendar = new CalendarPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("Calendar Test Board");
    await board.createList("To do");
    await board.createCard("Due today");
    await board.createCard("No due date");

    await board.openCard("Due today");
    await card.setDueDateToday();
    await page.getByRole("link", { name: "Close" }).click();
    await page.waitForURL((url) => /^\/boards\/[^/]+$/.test(url.pathname));

    await calendar.open();
    await calendar.expectCardOnDate("Due today", new Date());
    await expect(page.getByText("No due date", { exact: true })).toHaveCount(0);

    await calendar.openLists();
    await expect(
      page.getByText("Due today", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.getByText("No due date", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  },
);

test(
  "clicking a date on the calendar creates a card with that due date",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const calendar = new CalendarPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("Calendar Create Board");
    await board.createList("To do");

    await calendar.open();

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() <= 15 ? 20 : 10);

    await calendar.createCardOnDate(targetDate, "Scheduled card");
    await calendar.expectCardOnDate("Scheduled card", targetDate);

    const cardHref = await page
      .locator('a[href^="/cards/"]')
      .filter({ has: page.getByText("Scheduled card", { exact: true }) })
      .filter({ visible: true })
      .getAttribute("href");
    if (!cardHref) throw new Error("Could not find created calendar card link");
    const cardPublicId = cardHref.split("/cards/")[1]?.split("?")[0];

    const cardResponse = await page.request.get(
      `/api/trpc/card.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { cardPublicId } } }),
      )}`,
    );
    const cardBody = (await cardResponse.json()) as [
      { result: { data: { json: { dueDate: string | null } } } },
    ];
    const dueDate = cardBody[0].result.data.json.dueDate;
    expect(dueDate ? toDateKey(new Date(dueDate)) : null).toBe(
      toDateKey(targetDate),
    );
  },
);

test(
  "the calendar month can be navigated and reset with Today",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const calendar = new CalendarPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("Calendar Nav Board");
    await board.createList("To do");
    await calendar.open();

    const currentMonthLabel = await calendar.monthLabel();

    await calendar.goToNextMonth();
    await expect.poll(() => calendar.monthLabel()).not.toBe(currentMonthLabel);

    await calendar.goToToday();
    await expect.poll(() => calendar.monthLabel()).toBe(currentMonthLabel);
  },
);
