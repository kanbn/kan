import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "a cloud workspace admin sees a Billing tab in settings",
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

    await expect(
      page.getByRole("link", { name: "Billing", exact: true }),
    ).toBeVisible();
  },
);
