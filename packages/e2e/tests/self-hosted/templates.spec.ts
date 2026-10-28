import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a board can be created from a built-in template, seeding its lists",
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

    await board.createBoardFromTemplate("Template Test Board", "Basic Kanban");

    const listNameTextboxes = page.getByRole("textbox", {
      name: "List name",
    });
    await expect(listNameTextboxes).toHaveCount(3);

    const listNames = await listNameTextboxes.all();
    const values = await Promise.all(listNames.map((l) => l.inputValue()));
    expect(values).toEqual(["To Do", "In Progress", "Done"]);
  },
);
