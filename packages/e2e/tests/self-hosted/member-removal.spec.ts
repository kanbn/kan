import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

async function inviteSecondMember(ownerPage: Page, browser: Browser) {
  const members = new MembersPage(ownerPage);
  await members.open();
  const inviteLink = await members.createInviteLink();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  const memberUser = createTestUser();
  await new AuthPage(memberPage).signUp(memberUser);
  await new SelfHostedOnboardingPage(memberPage).createFirstWorkspace(
    "Member's Own Workspace",
  );
  await memberPage.goto(inviteLink);
  await memberPage.waitForURL(/\/boards\?workspacePublicId=/, {
    timeout: 20_000,
  });

  return { memberUser, memberContext, memberPage };
}

test(
  "an admin can remove a member from the workspace",
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

    const { memberUser, memberContext } = await inviteSecondMember(
      page,
      browser,
    );
    await memberContext.close();

    await page.reload();
    await members.open();
    await members.removeMember(memberUser.email);

    await expect(
      page.getByRole("row", { name: new RegExp(memberUser.email) }),
    ).toHaveCount(0);
  },
);
