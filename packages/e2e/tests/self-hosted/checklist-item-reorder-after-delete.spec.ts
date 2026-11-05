import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "reordering a checklist item lands correctly after a sibling was deleted",
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

    await board.createBoard("Checklist reorder test board");
    await board.createList("To do");
    await board.createCard("Checklist reorder test card");
    await board.openCard("Checklist reorder test card");

    await card.createChecklist("My checklist");
    await card.addChecklistItem("Item A");
    await card.addChecklistItem("Item B");
    await card.addChecklistItem("Item C");
    await card.addChecklistItem("Item D");

    await card.deleteChecklistItem("Item B");
    await expect
      .poll(() => card.getChecklistItemTitles())
      .toEqual(["Item A", "Item C", "Item D"]);

    await card.dragChecklistItemDown("Item A", 1);
    await expect
      .poll(() => card.getChecklistItemTitles())
      .toEqual(["Item C", "Item A", "Item D"]);

    // The order must survive a refetch from the server, not just the
    // optimistic update.
    await page.reload();
    await expect
      .poll(() => card.getChecklistItemTitles())
      .toEqual(["Item C", "Item A", "Item D"]);
  },
);
