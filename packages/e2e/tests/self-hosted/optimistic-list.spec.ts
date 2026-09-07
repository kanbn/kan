import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

test(
  "an optimistic list cannot be mutated before the server assigns its ID",
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
    await board.createBoard("Optimistic list test");

    let releaseListRequest: () => void = () => undefined;
    const listRequestGate = new Promise<void>((resolve) => {
      releaseListRequest = resolve;
    });
    await page.route(/\/api\/trpc\/list\.create/, async (route) => {
      await listRequestGate;
      await route.continue();
    });

    await page.getByRole("button", { name: "New list" }).click();
    await page.getByPlaceholder("List name").fill("Delayed list");
    const created = waitForTrpcMutation(page, "list.create");
    await page.getByRole("button", { name: "Create list" }).click();

    const listName = page.locator('input[aria-label="List name"][readonly]');
    await expect(listName).toHaveValue("Delayed list");
    await expect(listName).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("button", { name: "Add card", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "List options", exact: true }),
    ).toHaveCount(0);

    releaseListRequest();
    await created;
    await expect(
      page.getByRole("button", { name: "Add card", exact: true }),
    ).toBeEnabled();

    await board.createCard("Created after list acknowledgement");
    await expect(
      page.getByText("Created after list acknowledgement"),
    ).toBeVisible();
  },
);
