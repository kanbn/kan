import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

const LIVE = { timeout: 15_000 };

// Waits for the event stream, so the change being tested isn't made before it.
const streaming = (page: Page) =>
  page.waitForResponse((res) => /\/boards\/[^/]+\/events$/.test(res.url()));

async function openBoardTwice(page: Page, browser: Browser) {
  const user = createTestUser();
  const board = new BoardPage(page);
  await new AuthPage(page).signUp(user);
  await new SelfHostedOnboardingPage(page).createFirstWorkspace(
    "E2E Test Workspace",
  );
  await new DashboardPage(page).expectSignedInAs(user);
  await board.createBoard("E2E Test Board");
  await board.createList("To do");
  await board.createCard("First card", "To do");

  const context = await browser.newContext({
    storageState: await page.context().storageState(),
  });
  const other = await context.newPage();
  const stream = streaming(other);
  await other.goto(page.url());
  await stream;
  await expect(other.getByText("First card")).toBeVisible();

  return { board, context, other };
}

test(
  "changes to a board and its cards show up in another browser",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const { board, context, other } = await openBoardTwice(page, browser);

    await board.createCard("Second card", "To do");
    await expect(other.getByText("Second card")).toBeVisible(LIVE);

    const stream = streaming(other);
    await other.getByText("First card").click();
    await other.waitForURL(/\/cards\//);
    await stream;
    await expect(other.locator("#title")).toHaveValue("First card");

    await board.openCard("First card");
    const card = new CardPage(page);
    await card.editTitle("Renamed card");
    await expect(other.locator("#title")).toHaveValue("Renamed card", LIVE);
    await card.addComment("Hello from the other side");
    await expect(other.getByText("Hello from the other side")).toBeVisible(
      LIVE,
    );

    await context.close();
  },
);

test(
  "someone else's later change isn't overwritten by an earlier one of mine",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const { board, context, other } = await openBoardTwice(page, browser);
    const stream = streaming(other);
    await other.getByText("First card").click();
    await other.waitForURL(/\/cards\//);
    await stream;
    const title = other.locator("#title");
    const mine = new CardPage(other);
    await mine.editTitle("My title");
    await mine.editDescription("My text");

    await board.openCard("My title");
    const theirs = new CardPage(page);
    await theirs.editTitle("Their title");
    await expect(title).toHaveValue("Their title", LIVE);

    const description = (onPage: Page) =>
      onPage.locator('.tiptap[contenteditable="true"]').first();
    await mine.editDescription(" and more");
    await expect(description(page)).toContainText("and more", LIVE);
    await other.reload();
    await expect(title).toHaveValue("Their title");

    // Clicking into a field and out again doesn't put the old text back.
    await mine.editDescription("!");
    await expect(description(page)).toContainText("!", LIVE);
    await theirs.editDescription("Their text");
    await expect(description(other)).toContainText("Their text", LIVE);
    await description(other).click();
    await title.click();
    await other.waitForTimeout(1_000);
    await other.reload();
    await expect(description(other)).toContainText("Their text");

    await context.close();
  },
);

test(
  "live changes don't replace what's being typed or dragged",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const { board, context, other } = await openBoardTwice(page, browser);

    // A board name being typed.
    const name = other.getByRole("textbox", { name: "Board name" });
    await name.fill("Half typed na");
    await board.createCard("Second card", "To do");
    await expect(other.getByText("Second card")).toBeVisible(LIVE);
    await expect(name).toHaveValue("Half typed na");

    // A card being dragged.
    const box = await other
      .locator("[data-card-id]")
      .filter({ hasText: "First card" })
      .boundingBox();
    if (!box) throw new Error("Card isn't visible");
    await other.mouse.move(box.x + 40, box.y + 15);
    await other.mouse.down();
    await other.mouse.move(box.x + 60, box.y + 40, { steps: 5 });
    await board.createCard("Third card", "To do");
    await other.waitForTimeout(4_000);
    await expect(other.getByText("Third card")).toHaveCount(0);
    await other.mouse.move(box.x + 40, box.y + 15, { steps: 5 });
    await other.mouse.up();
    await expect(other.getByText("Third card")).toBeVisible(LIVE);

    // A description being typed.
    const stream = streaming(other);
    await other.getByText("First card").click();
    await other.waitForURL(/\/cards\//);
    await stream;
    const description = other
      .locator('.tiptap[contenteditable="true"]')
      .first();
    await description.click();
    await description.pressSequentially("Half typed text");

    await board.openCard("First card");
    const card = new CardPage(page);
    await card.editDescription("Saved by someone else");
    await card.addComment("Reloaded");
    await expect(other.getByText("Reloaded")).toBeVisible(LIVE);
    await expect(description).toHaveText("Half typed text");

    await context.close();
  },
);
