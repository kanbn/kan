import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToPro,
} from "../support/cloud-billing";
import { SettingsPage } from "../support/pages/settings-page";
import { StripeBillingPortalPage } from "../support/pages/stripe-billing-portal-page";
import {
  advanceTrialToEnd,
  deleteTestClock,
  getCustomerIdForUserEmail,
  getSubscriptionStatusForCustomer,
} from "../support/stripe-client";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "upgrading to pro unlocks paid features; cancelling during the trial keeps access until it ends, then reverts to free",
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

    await signUpAndUpgradeToPro(page, user);

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-pro-slug-${Date.now()}`);

    await settings.goToTab("Billing");
    await page.getByRole("button", { name: "Billing portal" }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
    await billingPortal.scheduleCancellation();
    await billingPortal.returnToApp();
    await page.waitForURL(/\/settings/, { timeout: 30_000 });

    const customerId = await getCustomerIdForUserEmail(user.email);

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Pro (unlimited members)")).toBeVisible();
    }).toPass({ timeout: 20_000 });

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-still-pro-slug-${Date.now()}`);

    const clockId = await advanceTrialToEnd(customerId);

    const status = await getSubscriptionStatusForCustomer(customerId);
    expect(status).toBe("canceled");

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Free (1 member)")).toBeVisible();
    }).toPass({ timeout: 30_000 });

    await page.reload();
    await settings.open();
    await settings.goToTab("Workspace");
    await settings.attemptWorkspaceSlugUpdate(`e2e-blocked-slug-${Date.now()}`);
    await expect(page).toHaveURL(/\/upgrade\/select-plan\?.*plan=pro/);

    await deleteTestClock(clockId);
  },
);

test(
  "letting the trial run its course (no cancellation) converts to a paid subscription and keeps pro access",
  { tag: "@cloud" },
  async ({ page }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(90_000);

    const user = createTestUser();
    const settings = new SettingsPage(page);

    await signUpAndUpgradeToPro(page, user);

    const customerId = await getCustomerIdForUserEmail(user.email);

    const clockId = await advanceTrialToEnd(customerId);

    const status = await getSubscriptionStatusForCustomer(customerId);
    expect(status).toBe("active");

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Pro (unlimited members)")).toBeVisible();
    }).toPass({ timeout: 30_000 });

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-post-trial-pro-slug-${Date.now()}`);

    await deleteTestClock(clockId);
  },
);
