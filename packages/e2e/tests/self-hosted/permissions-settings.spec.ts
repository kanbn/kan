import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
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
  "an admin can revoke a role permission via the UI, and it persists",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    await settings.open();
    await settings.goToTab("Permissions");

    await expect(
      settings.isRolePermissionChecked("Can create cards", "member"),
    ).resolves.toBe(true);

    await settings.setRolePermission("Can create cards", "member", false);

    await page.reload();
    await expect(
      settings.isRolePermissionChecked("Can create cards", "member"),
    ).resolves.toBe(false);
  },
);

test(
  "revoking a permission from the member role blocks that action for members",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const settings = new SettingsPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    await board.createBoard("E2E Test Board");
    await board.createList("To do");
    const boardPublicId = page.url().split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not resolve board from URL");

    const listResponse = await page.request.get(
      `/api/trpc/board.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({
          "0": { json: { boardPublicId } },
        }),
      )}`,
    );
    const listBody = (await listResponse.json()) as [
      { result: { data: { json: { lists: { publicId: string }[] } } } },
    ];
    const targetListPublicId = listBody[0].result.data.json.lists[0]?.publicId;
    if (!targetListPublicId) throw new Error("Could not resolve list publicId");

    await settings.open();
    await settings.goToTab("Permissions");
    await settings.setRolePermission("Can create cards", "member", false);

    const { memberPage, memberContext } = await inviteSecondMember(
      page,
      browser,
    );

    const cardInput = {
      title: "Blocked card",
      description: "",
      listPublicId: targetListPublicId,
      labelPublicIds: [],
      memberPublicIds: [],
      position: "start" as const,
    };

    const blockedResponse = await memberPage.request.post(
      "/api/trpc/card.create?batch=1",
      { data: { "0": { json: cardInput } } },
    );
    expect(blockedResponse.status()).toBe(403);

    await settings.open();
    await settings.goToTab("Permissions");
    await settings.setRolePermission("Can create cards", "member", true);

    const allowedResponse = await memberPage.request.post(
      "/api/trpc/card.create?batch=1",
      { data: { "0": { json: cardInput } } },
    );
    expect(allowedResponse.ok()).toBe(true);

    await memberContext.close();
  },
);
