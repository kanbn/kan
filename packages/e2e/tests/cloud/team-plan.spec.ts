import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToPlan,
} from "../support/cloud-billing";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { MembersPage } from "../support/pages/members-page";
import {
  getCustomerIdForUserEmail,
  getSubscriptionSeatsForCustomer,
} from "../support/stripe-client";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "upgrading to team is seat-billed: inviting a member bumps Stripe's subscription quantity",
  { tag: "@cloud" },
  async ({ page, browser }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(90_000);

    const userA = createTestUser();
    const members = new MembersPage(page);

    await signUpAndUpgradeToPlan(page, userA, "team");

    const customerId = await getCustomerIdForUserEmail(userA.email);
    expect(await getSubscriptionSeatsForCustomer(customerId)).toBe(1);

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
    await userBContext.close();

    await expect(async () => {
      expect(await getSubscriptionSeatsForCustomer(customerId)).toBe(2);
    }).toPass({ timeout: 20_000 });
  },
);
