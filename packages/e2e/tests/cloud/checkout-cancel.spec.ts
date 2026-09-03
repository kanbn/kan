import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
} from "../support/cloud-billing";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SettingsPage } from "../support/pages/settings-page";
import { StripeCheckoutPage } from "../support/pages/stripe-checkout-page";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "canceling out of a Team checkout returns to the plan picker, not billing settings",
  { tag: "@cloud" },
  async ({ page }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(60_000);

    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);
    const checkout = new StripeCheckoutPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await settings.open();
    await settings.goToTab("Billing");
    await page.getByRole("button", { name: "Choose plan" }).click();
    await page.waitForURL(/\/upgrade\/select-plan/);

    await page.getByRole("button", { name: /^Team\b/ }).click();
    await page.getByRole("button", { name: "Upgrade" }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    await checkout.cancel();

    await page.waitForURL(/\/upgrade\/select-plan/, { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/settings\/billing/);
    await expect(page.getByRole("button", { name: "Upgrade" })).toBeVisible();

    await page.goto("/settings/billing");
    await expect(page.getByText("Free (1 member)")).toBeVisible();
  },
);
