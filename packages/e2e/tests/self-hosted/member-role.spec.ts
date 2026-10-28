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
  "an admin can change a member's role",
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
    await members.changeRole(memberUser.email, "admin");

    await expect(
      page.getByRole("row", { name: new RegExp(memberUser.email) }),
    ).toContainText("Admin");
  },
);

test(
  "the backend rejects a role change from a member without permission",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    const { memberUser, memberPage, memberContext } = await inviteSecondMember(
      page,
      browser,
    );

    const membersResponse = await memberPage.request.get(
      `/api/trpc/workspace.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { workspacePublicId } } }),
      )}`,
    );
    const membersBody = (await membersResponse.json()) as [
      {
        result: {
          data: {
            json: { members: { publicId: string; email: string }[] };
          };
        };
      },
    ];
    const ownMember = membersBody[0].result.data.json.members.find(
      (m) => m.email === memberUser.email,
    );
    if (!ownMember) {
      throw new Error("Could not resolve invited member's own record");
    }

    const response = await memberPage.request.post(
      "/api/trpc/member.updateRole?batch=1",
      {
        data: {
          "0": {
            json: {
              workspacePublicId,
              memberPublicId: ownMember.publicId,
              role: "admin",
            },
          },
        },
      },
    );
    expect(response.status()).toBe(403);

    await memberContext.close();
  },
);
