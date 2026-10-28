import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "a webhook can be created and then deleted",
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
    await settings.goToTab("Webhooks");
    await settings.createWebhook(
      "E2E Test Webhook",
      "https://example.com/e2e-webhook",
    );

    await expect(page.getByText("E2E Test Webhook")).toBeVisible();
    await expect(
      page.getByText("https://example.com/e2e-webhook"),
    ).toBeVisible();

    await settings.deleteWebhook();
    await expect(page.getByText("E2E Test Webhook")).toHaveCount(0);
  },
);
