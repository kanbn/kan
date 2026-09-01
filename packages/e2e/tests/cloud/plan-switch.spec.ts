import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToPlan,
} from "../support/cloud-billing";
import { SettingsPage } from "../support/pages/settings-page";
import { StripeBillingPortalPage } from "../support/pages/stripe-billing-portal-page";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "switching from pro to team re-applies the pro-only workspace slug restriction",
  { tag: "@cloud" },
  async ({ page }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(90_000);

    const user = createTestUser();
    const settings = new SettingsPage(page);
    const billingPortal = new StripeBillingPortalPage(page);

    await signUpAndUpgradeToPlan(page, user, "pro");

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-pro-slug-${Date.now()}`);

    await settings.goToTab("Billing");
    await page.getByRole("button", { name: "Billing portal" }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
    await billingPortal.switchPlan();
    await billingPortal.returnToApp();
    await page.waitForURL(/\/settings/, { timeout: 30_000 });

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Team (1 member)")).toBeVisible();
    }).toPass({ timeout: 20_000 });

    await settings.goToTab("Workspace");
    await settings.attemptWorkspaceSlugUpdate(`e2e-blocked-slug-${Date.now()}`);
    await expect(page).toHaveURL(/\/upgrade\/select-plan\?.*plan=pro/);
  },
);
