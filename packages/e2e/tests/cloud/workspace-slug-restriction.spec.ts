import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "changing the workspace URL on a free plan redirects to the upgrade page",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await settings.open();
    await settings.goToTab("Workspace");
    await settings.attemptWorkspaceSlugUpdate(`e2e-slug-${Date.now()}`);

    await expect(page).toHaveURL(/\/upgrade\/select-plan\?.*plan=pro/);
  },
);

test(
  "the backend rejects a workspace slug change on a free cloud plan",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    expect(workspacePublicId).toBeTruthy();

    const response = await page.request.post(
      "/api/trpc/workspace.update?batch=1",
      {
        data: {
          "0": {
            json: {
              workspacePublicId,
              slug: `e2e-slug-${Date.now()}`,
            },
          },
        },
      },
    );

    expect(response.status()).toBe(403);
    const body = (await response.json()) as [
      { error: { json: { message: string } } },
    ];
    expect(body[0].error.json.message).toBe(
      "Workspace slug cannot be changed in cloud without upgrading to a paid plan",
    );
  },
);
