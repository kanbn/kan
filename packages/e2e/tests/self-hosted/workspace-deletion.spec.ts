import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "a workspace can be deleted",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    await settings.open();
    await settings.goToTab("Workspace");
    await settings.deleteWorkspace();

    await page.waitForURL((url) => !url.pathname.startsWith("/settings"));

    const response = await page.request.get(
      `/api/trpc/workspace.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { workspacePublicId } } }),
      )}`,
    );
    expect(response.status()).toBe(404);
  },
);
