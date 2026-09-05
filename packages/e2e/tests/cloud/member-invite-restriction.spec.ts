import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { createTestUser } from "../support/test-user";

test(
  "inviting a member on a free plan prompts an upgrade instead of a submit button",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const members = new MembersPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await members.open();
    await members.openInviteModal();

    await expect(page.getByRole("link", { name: "Choose plan" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Invite member" }),
    ).toHaveCount(0);
  },
);

test(
  "the backend rejects inviting a member on a free cloud plan",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    expect(workspacePublicId).toBeTruthy();

    const inviteResponse = await page.request.post(
      "/api/trpc/member.invite?batch=1",
      {
        data: {
          "0": {
            json: {
              email: `e2e-invitee-${Date.now()}@kan-test.local`,
              workspacePublicId,
            },
          },
        },
      },
    );
    expect(inviteResponse.status()).toBe(404);

    const linkResponse = await page.request.post(
      "/api/trpc/member.createInviteLink?batch=1",
      { data: { "0": { json: { workspacePublicId } } } },
    );
    expect(linkResponse.status()).toBe(403);
    const linkBody = (await linkResponse.json()) as [
      { error: { json: { message: string } } },
    ];
    expect(linkBody[0].error.json.message).toBe(
      "Invite links require a Team or Pro subscription",
    );
  },
);
