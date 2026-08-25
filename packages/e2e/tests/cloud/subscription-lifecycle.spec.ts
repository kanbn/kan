import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import type { StripeListener } from "../support/stripe-listen";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SettingsPage } from "../support/pages/settings-page";
import { StripeCheckoutPage } from "../support/pages/stripe-checkout-page";
import { cancelActiveSubscriptionForUserEmail } from "../support/stripe-client";
import { startStripeListen } from "../support/stripe-listen";
import { createTestUser } from "../support/test-user";

function isStripeCliAvailable(): boolean {
  try {
    execFileSync("stripe", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const hasRealStripeCredentials =
  !!process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "sk_test_e2e_placeholder" &&
  isStripeCliAvailable();

let authListener: StripeListener | undefined;
let legacyListener: StripeListener | undefined;

test.beforeAll(async () => {
  if (!hasRealStripeCredentials) return;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Missing required env var: STRIPE_SECRET_KEY");

  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ??
    `http://localhost:${process.env.CLOUD_PORT ?? "3100"}`;
  [authListener, legacyListener] = await Promise.all([
    startStripeListen(`${baseURL}/api/auth/stripe/webhook`, apiKey),
    startStripeListen(`${baseURL}/api/stripe/webhook`, apiKey),
  ]);
});

test.afterAll(() => {
  authListener?.stop();
  legacyListener?.stop();
});

test(
  "upgrading to pro unlocks paid features, and cancelling reverts to free",
  { tag: "@cloud" },
  async ({ page }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );

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

    await page.getByRole("button", { name: "Upgrade" }).click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await checkout.payWithTestCard(user.email);
    await page.waitForURL(/\/settings\/billing/, { timeout: 30_000 });

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Pro (unlimited members)")).toBeVisible();
    }).toPass({ timeout: 20_000 });

    await settings.goToTab("Workspace");
    await settings.updateWorkspaceSlug(`e2e-pro-slug-${Date.now()}`);

    await cancelActiveSubscriptionForUserEmail(user.email);

    await expect(async () => {
      await page.reload();
      await settings.open();
      await settings.goToTab("Billing");
      await expect(page.getByText("Free (1 member)")).toBeVisible();
    }).toPass({ timeout: 20_000 });

    await page.reload();
    await settings.open();
    await settings.goToTab("Workspace");
    await settings.attemptWorkspaceSlugUpdate(`e2e-blocked-slug-${Date.now()}`);
    await expect(page).toHaveURL(/\/upgrade\/select-plan\?.*plan=pro/);
  },
);
