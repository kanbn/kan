import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { createTestUser } from "../support/test-user";

test(
  "creating a second workspace still shows the free Solo plan, not just Team",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("First Workspace");
    await dashboard.expectSignedInAs(user);

    await page.getByRole("button", { name: "First Workspace" }).click();
    await page.getByRole("menuitem", { name: "Create workspace" }).click();

    await page.waitForURL(/\/onboarding\/select-plan\?returnUrl=/);
    await expect(page).not.toHaveURL(/workspacePublicId=/);

    await expect(
      page.getByRole("heading", { name: "Choose a plan" }),
    ).toBeVisible();
    await expect(page.getByText("Solo", { exact: true })).toBeVisible();
    await expect(page.getByText("Team", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.waitForURL(/\/onboarding\/workspace/);
    await page.getByPlaceholder("Workspace name").fill("Second Workspace");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.waitForURL(/\/boards/);
    await expect(
      page.getByRole("button", { name: "Second Workspace" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Second Workspace" }).click();
    await expect(
      page.getByRole("menuitem", { name: "First Workspace" }),
    ).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: "Second Workspace" }),
    ).toBeVisible();
  },
);
