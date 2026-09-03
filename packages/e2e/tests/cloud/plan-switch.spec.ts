import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToTeam,
} from "../support/cloud-billing";
import { SettingsPage } from "../support/pages/settings-page";
import { StripeBillingPortalPage } from "../support/pages/stripe-billing-portal-page";
import {
  advanceTrialToEnd,
  deleteTestClock,
  getCustomerIdForUserEmail,
} from "../support/stripe-client";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "downgrading from team to free re-applies the free-plan workspace slug restriction",
  { tag: "@cloud" },
  async ({ page }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(150_000);

    const user = createTestUser();
    const settings = new SettingsPage(page);
    const billingPortal = new StripeBillingPortalPage(page);

    await signUpAndUpgradeToTeam(page, user);

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-team-slug-${Date.now()}`);

    const customerId = await getCustomerIdForUserEmail(user.email);
    await settings.goToTab("Billing");
    await page.getByRole("button", { name: "Billing portal" }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
    await billingPortal.scheduleCancellation();
    await billingPortal.returnToApp();
    await page.waitForURL(/\/settings/, { timeout: 30_000 });

    const clockId = await advanceTrialToEnd(customerId);

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Free (1 member)")).toBeVisible();
    }).toPass({ timeout: 45_000 });

    await settings.goToTab("Workspace");
    await settings.attemptWorkspaceSlugUpdate(`e2e-blocked-slug-${Date.now()}`);
    await expect(page).toHaveURL(/\/upgrade\/select-plan\?.*plan=team/);

    await deleteTestClock(clockId);
  },
);
