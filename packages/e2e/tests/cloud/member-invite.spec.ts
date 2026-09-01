import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToPro,
} from "../support/cloud-billing";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { MembersPage } from "../support/pages/members-page";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "a second user can join a pro workspace via a shared invite link",
  { tag: "@cloud" },
  async ({ page, browser }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(60_000);

    const userA = createTestUser();
    const members = new MembersPage(page);

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
    await userBContext.close();

    await page.bringToFront();
    await page.reload();
    await members.open();
    await expect(page.getByText(userB.email)).toBeVisible();
  },
);
