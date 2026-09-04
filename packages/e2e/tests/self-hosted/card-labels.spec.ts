import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

test(
  "a label can be created, assigned, and edited with a custom colour",
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
    await board.createCard("Label test card");
    await board.openCard("Label test card");

    const labelPublicId = await card.createAndAssignLabel("Urgent");

    await expect(card.assignedLabelBadge("Urgent")).toBeVisible();

    await page.reload();
    await expect(card.assignedLabelBadge("Urgent")).toBeVisible();

    const response = await page.request.post("/api/trpc/label.update?batch=1", {
      data: {
        "0": {
          json: {
            labelPublicId,
            name: "Urgent",
            colourCode: "#4bce97",
          },
        },
      },
    });
    expect(response.ok()).toBe(true);

    await page.reload();
    await card.openLabelEditor("Urgent");

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "#4bce97" })).toBeVisible();

    const updated = waitForTrpcMutation(page, "label.update");
    await dialog.getByRole("button", { name: "Update label" }).click();
    const updatedResponse = await updated;
    expect(updatedResponse.ok()).toBe(true);
  },
);
