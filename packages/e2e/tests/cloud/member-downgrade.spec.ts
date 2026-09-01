import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToPro,
} from "../support/cloud-billing";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { MembersPage } from "../support/pages/members-page";
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
  "downgrading a multi-member workspace pauses the invited member's access but preserves the owner's",
  { tag: "@cloud" },
  async ({ page, browser }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(150_000);

    const userA = createTestUser();
    const members = new MembersPage(page);
    const settings = new SettingsPage(page);
    const billingPortal = new StripeBillingPortalPage(page);

    await signUpAndUpgradeToPro(page, userA);

    await members.open();
    const inviteLink = await members.createInviteLink();

    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();
    const userB = createTestUser();
    const authB = new AuthPage(userBPage);
    const onboardingB = new CloudOnboardingPage(userBPage);

    await authB.signUp(userB);
    await onboardingB.completeSoloPlanOnboarding("User B's Own Workspace");
    await userBPage.goto(inviteLink);
    await userBPage.waitForURL(/\/boards\?workspacePublicId=/, {
      timeout: 20_000,
    });
    const workspacePublicId = new URL(userBPage.url()).searchParams.get(
      "workspacePublicId",
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in redirect URL");
    }

    await page.bringToFront();
    await page.reload();
    await members.open();
    await expect(page.getByText(userB.email)).toBeVisible();

    const customerId = await getCustomerIdForUserEmail(userA.email);
    await settings.open();
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

    await members.open();
    await expect(
      page.getByRole("row", { name: new RegExp(userB.email) }),
    ).toContainText("Paused");

    const boardAllUrl = `/api/trpc/board.all?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: { workspacePublicId } } }),
    )}`;

    const ownerBoardsResponse = await page.request.get(boardAllUrl);
    expect(ownerBoardsResponse.ok()).toBe(true);

    const pausedMemberBoardsResponse = await userBPage.request.get(boardAllUrl);
    expect(pausedMemberBoardsResponse.status()).toBe(403);

    await deleteTestClock(clockId);
    await userBContext.close();
  },
);
