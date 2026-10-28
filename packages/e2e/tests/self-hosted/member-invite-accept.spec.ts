import { expect, test } from "@playwright/test";

import { clearMailpitInbox, getMagicLinkUrl } from "../support/mailpit-client";
import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "an invited member receives a real email and can accept the invite",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const members = new MembersPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    const invitedEmail = createTestUser().email;
    await clearMailpitInbox();

    await members.open();
    await members.inviteByEmail(invitedEmail);

    const magicLinkUrl = await getMagicLinkUrl(invitedEmail);

    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();
    await inviteePage.goto(magicLinkUrl);
    await inviteePage.waitForURL(/\/boards/);
    await inviteeContext.close();

    await page.reload();
    await expect(
      page.getByRole("row", { name: new RegExp(invitedEmail) }),
    ).not.toContainText("Pending");
  },
);
