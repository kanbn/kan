import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CalendarPage } from "../support/pages/calendar-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForApi } from "../support/wait-for-api";

async function createBoardWithCard(page: Page) {
  const user = createTestUser();
  const board = new BoardPage(page);
  await new AuthPage(page).signUp(user);
  await new SelfHostedOnboardingPage(page).createFirstWorkspace(
    "E2E Test Workspace",
  );
  await new DashboardPage(page).expectSignedInAs(user);
  await board.createBoard("E2E Test Board");
  await board.createList("To do");
  await board.createList("Finished");
  await board.createCard("Quick card", "To do");
  return board;
}

const list = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name} `) });

async function setDueToday(page: Page, board: BoardPage) {
  await board.openCardMenu("Quick card");
  await page.getByRole("menuitem", { name: "Due date" }).click();
  const updated = waitForApi(page, "PUT", /^\/cards\/[^/]+$/);
  await page.getByRole("menuitem", { name: "Today" }).click();
  await updated;
}

test(
  "a card's members, due date and list can be changed from its right-click menu",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const board = await createBoardWithCard(page);

    await board.openCardMenu("Quick card");
    await page.getByRole("menuitem", { name: "Members" }).click();
    const member = page.getByRole("menuitemcheckbox").first();
    const assigned = waitForApi(page, "PUT", /^\/cards\/[^/]+\/members\//);
    await member.click();
    await assigned;
    await expect(member).toBeChecked();
    await page.keyboard.press("Escape");

    await setDueToday(page, board);

    await board.openCardMenu("Quick card");
    await board.openCardMoveMenu();
    const moved = waitForApi(page, "PUT", /^\/cards\/[^/]+$/);
    await page.getByRole("menuitemradio", { name: "Finished" }).click();
    await moved;

    await page.reload();
    await expect(list(page, "Finished")).toContainText("Quick card");
    await expect(list(page, "To do")).not.toContainText("Quick card");
  },
);

test(
  "a label created from a card's right-click menu is added to the card",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const board = await createBoardWithCard(page);

    await board.openCardMenu("Quick card");
    await page.getByRole("menuitem", { name: "Labels" }).click();
    await page.getByRole("menuitem", { name: "Create new label" }).click();
    await page.locator("#label-name").fill("Urgent");
    const added = waitForApi(page, "PUT", /^\/cards\/[^/]+\/labels\//);
    await page.getByRole("button", { name: "Create label" }).click();
    const labelPublicId = (await added).url().split("/").pop();

    await expect(list(page, "To do")).toContainText("Urgent");

    // Unticking the label a board is filtered by hides the card, but not its menu.
    const toggleUrgent = async (cardTitle: string) => {
      await board.openCardMenu(cardTitle);
      await page.getByRole("menuitem", { name: "Labels" }).click();
      const toggled = waitForApi(page, "PUT", /^\/cards\/[^/]+\/labels\//);
      await page.getByRole("menuitemcheckbox", { name: "Urgent" }).click();
      await toggled;
    };
    await board.createCard("Other card", "To do");
    await toggleUrgent("Other card");
    const boardUrl = page.url().split("?")[0];
    await page.goto(`${boardUrl}?labels=${labelPublicId}`);
    await toggleUrgent("Quick card");
    await expect(
      page.locator("[data-card-id]").filter({ hasText: "Quick card" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Urgent" }),
    ).not.toBeChecked();
  },
);

test(
  "the right-click menu works on the calendar",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const board = await createBoardWithCard(page);
    const calendar = new CalendarPage(page);

    await setDueToday(page, board);
    await calendar.open();
    await calendar.expectCardOnDate("Quick card", new Date());

    await board.openCardMenu("Quick card");
    await page.getByRole("menuitem", { name: "Delete card" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.locator("[data-card-id]").filter({ hasText: "Quick card" }),
    ).toHaveCount(0);
  },
);

test(
  "people who can only view a board aren't offered changes",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const board = await createBoardWithCard(page);

    await page.route("**/permissions/me", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { permissions: string[] };
      await route.fulfill({
        response,
        json: {
          ...body,
          permissions: body.permissions.filter((name) =>
            name.endsWith(":view"),
          ),
        },
      });
    });
    await page.reload();
    await expect(page.getByText("Quick card")).toBeVisible();

    await board.openCardMenu("Quick card");
    await expect(
      page.getByRole("menuitem", { name: "Copy card link" }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Labels" })).toHaveCount(0);
    await expect(
      page.getByRole("menuitem", { name: "Delete card" }),
    ).toHaveCount(0);
  },
);
