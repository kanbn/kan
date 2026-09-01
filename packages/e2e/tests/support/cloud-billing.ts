import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { StripeListener } from "./stripe-listen";
import type { TestUser } from "./test-user";
import { AuthPage } from "./pages/auth-page";
import { CloudOnboardingPage } from "./pages/cloud-onboarding-page";
import { DashboardPage } from "./pages/dashboard-page";
import { SettingsPage } from "./pages/settings-page";
import { StripeCheckoutPage } from "./pages/stripe-checkout-page";
import { startStripeListen } from "./stripe-listen";

function isStripeCliAvailable(): boolean {
  try {
    execFileSync("stripe", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export const hasRealStripeCredentials =
  !!process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "sk_test_e2e_placeholder" &&
  isStripeCliAvailable();

export function setupStripeWebhookForwarding() {
  let authListener: StripeListener | undefined;
  let legacyListener: StripeListener | undefined;

  test.beforeAll(async () => {
    if (!hasRealStripeCredentials) return;

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("Missing required env var: STRIPE_SECRET_KEY");
    }

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
}

export async function signUpAndUpgradeToPlan(
  page: Page,
  user: TestUser,
  plan: "pro" | "team",
) {
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

  if (plan === "team") {
    await page.getByRole("button", { name: /^Team\b/ }).click();
  }

  await page.getByRole("button", { name: "Upgrade" }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  await checkout.payWithTestCard(user.email);
  await page.waitForURL(/\/settings\/billing/, { timeout: 30_000 });

  const expectedLabel =
    plan === "team" ? "Team (1 member)" : "Pro (unlimited members)";
  await expect(async () => {
    await page.reload();
    await settings.open();
    await settings.goToTab("Billing");
    await expect(page.getByText(expectedLabel)).toBeVisible();
  }).toPass({ timeout: 20_000 });
}

export async function signUpAndUpgradeToPro(page: Page, user: TestUser) {
  await signUpAndUpgradeToPlan(page, user, "pro");
}
