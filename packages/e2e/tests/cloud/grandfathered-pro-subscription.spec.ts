import { expect, test } from "@playwright/test";

import { seedGrandfatheredProSubscription } from "../support/db-client";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "a workspace grandfathered onto Pro keeps its Pro features",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);
    const members = new MembersPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Grandfathered Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    await seedGrandfatheredProSubscription(workspacePublicId);
    await page.reload();

    await settings.open();
    await settings.goToTab("Billing");
    await expect(page.getByText("Pro (unlimited members)")).toBeVisible();

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-grandfathered-pro-${Date.now()}`);

    await members.open();
    await expect(page.getByText("Pro Plan")).toBeVisible();
    await expect(page.getByText("Unlimited seats")).toBeVisible();
  },
);
