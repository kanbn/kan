import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardMembersPage } from "../support/pages/board-members-page";
import { BoardPage } from "../support/pages/board-page";
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

  const ownerWorkspacePublicId = new URL(memberPage.url()).searchParams.get(
    "workspacePublicId",
  );
  if (!ownerWorkspacePublicId) {
    throw new Error("Expected workspacePublicId in the post-invite URL");
  }

  return { memberUser, memberContext, memberPage, ownerWorkspacePublicId };
}

test(
  "a board is invisible to a newly invited member until an admin adds them to it on the board members page",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const boardMembers = new BoardMembersPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    await board.createBoard("Members Board");
    const boardUrl = page.url();

    const { memberUser, memberContext, memberPage, ownerWorkspacePublicId } =
      await inviteSecondMember(page, browser);

    // Pin the workspace: WorkspaceProvider can race to the member's own one post-invite.
    await memberPage.goto(`/boards?workspacePublicId=${ownerWorkspacePublicId}`);
    await expect(
      memberPage.getByRole("link", { name: "Members Board" }),
    ).toHaveCount(0);

    await page.goto(boardUrl);
    await board.goToBoardMembers();
    await boardMembers.addMember(memberUser.email);

    await memberPage.goto(`/boards?workspacePublicId=${ownerWorkspacePublicId}`);
    await expect(
      memberPage.getByRole("link", { name: "Members Board" }),
    ).toBeVisible();

    await memberContext.close();
  },
);

test(
  "the only board admin cannot be removed, even by a workspace admin",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const owner = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const boardMembers = new BoardMembersPage(page);

    await auth.signUp(owner);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(owner);

    await board.createBoard("Admin Guard Board");
    const boardUrl = page.url();

    const { memberUser, memberContext, memberPage } = await inviteSecondMember(
      page,
      browser,
    );

    await page.goto(boardUrl);
    await board.goToBoardMembers();
    await boardMembers.addMember(memberUser.email);
    await boardMembers.changeRole(memberUser.email, "admin");

    // The promoted member (now a board admin) removes the owner. Two
    // admins exist at this point, so this succeeds and leaves the member
    // as the board's only admin.
    const memberBoardMembers = new BoardMembersPage(memberPage);
    await memberPage.goto(page.url());
    await memberBoardMembers.removeMember(owner.email);

    // The owner is no longer a board member, but remains a workspace
    // admin, so they can still reach this page and attempt to remove the
    // board's sole remaining admin.
    await page.reload();
    await boardMembers.removeMember(memberUser.email);

    await expect(
      page.getByText("Cannot remove the only admin of this board"),
    ).toBeVisible();

    await memberContext.close();
  },
);
