import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

test(
  "editing a checklist item right after creating it keeps the cursor and the edit",
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

    await board.createBoard("Checklist race test board");
    await board.createList("To do");
    await board.createCard("Checklist race test card");
    await board.openCard("Checklist race test card");

    await card.createChecklist("My checklist");

    let releaseCreateItemRequest: () => void = () => undefined;
    const createItemGate = new Promise<void>((resolve) => {
      releaseCreateItemRequest = resolve;
    });
    await page.route(/\/api\/trpc\/checklist\.createItem/, async (route) => {
      await createItemGate;
      await route.continue();
    });

    await page
      .getByRole("button", { name: "Add checklist item", exact: true })
      .click();
    const itemInput = page.locator('[id^="checklist-item-input-"]');
    await itemInput.click();
    await itemInput.pressSequentially("foo bar");
    const created = waitForTrpcMutation(page, "checklist.createItem");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(200);

    const itemRow = page
      .locator(".plain-text-editor")
      .filter({ hasText: "foo bar" });
    const itemEditor = itemRow.locator('[contenteditable="true"]');
    await expect(itemRow).toBeVisible();
    await itemEditor.click();
    await page.keyboard.press("ControlOrMeta+A");
    await itemEditor.pressSequentially("baz bar");

    releaseCreateItemRequest();
    await created;

    const itemText = page.locator(".plain-text-editor").filter({
      hasText: "baz bar",
    });

    const updated = waitForTrpcMutation(page, "checklist.updateItem");
    await page.locator("#title").click();
    await expect(itemText).toBeVisible();
    await expect(
      page.locator(".plain-text-editor").filter({ hasText: "foo bar" }),
    ).toHaveCount(0);
    await updated;

    await page.reload();
    await expect(itemText).toBeVisible();
  },
);
