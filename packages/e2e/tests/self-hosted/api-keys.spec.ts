import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "an API key can be created and then revoked",
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

    await settings.open();
    await settings.goToTab("API");
    await settings.createApiKey("E2E Test Key");

    await expect(page.getByText("E2E Test Key")).toBeVisible();

    await settings.revokeApiKey();
    await expect(page.getByText("E2E Test Key")).toHaveCount(0);
  },
);
