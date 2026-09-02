import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "an invited member appears with a pending badge",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const members = new MembersPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    const invitedEmail = createTestUser().email;

    await members.open();
    await members.inviteByEmail(invitedEmail);

    await expect(
      page.getByRole("row", { name: new RegExp(invitedEmail) }),
    ).toContainText("Pending");
  },
);
