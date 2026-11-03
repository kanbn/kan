import type { Browser, Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import type { TestUser } from "../support/test-user";
import {
  clearMailpitInbox,
  expectMailpitMessageCountToRemain,
  waitForMailpitMessageCount,
} from "../support/mailpit-client";
import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

async function joinWorkspace(
  ownerPage: Page,
  browser: Browser,
  member: TestUser,
) {
  const members = new MembersPage(ownerPage);
  await members.open();
  const inviteLink = await members.createInviteLink();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await new AuthPage(memberPage).signUp(member);
  await new SelfHostedOnboardingPage(memberPage).createFirstWorkspace(
    "Mention Recipient Workspace",
  );
  await memberPage.goto(inviteLink);
  await memberPage.waitForURL(/\/boards\?workspacePublicId=/, {
    timeout: 20_000,
  });
  await memberContext.close();
}

async function addToBoard(page: Page, boardPublicId: string, email: string) {
  const workspacePublicId = await page.evaluate(() =>
    localStorage.getItem("workspacePublicId"),
  );
  if (!workspacePublicId)
    throw new Error("workspacePublicId not found in localStorage");

  const workspaceResponse = await page.request.get(
    `/api/trpc/workspace.byId?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: { workspacePublicId } } }),
    )}`,
  );
  const workspaceBody = (await workspaceResponse.json()) as [
    {
      result: {
        data: { json: { members: { publicId: string; email?: string }[] } };
      };
    },
  ];
  const member = workspaceBody[0].result.data.json.members.find(
    (m) => m.email === email,
  );
  if (!member) throw new Error(`Could not resolve member ${email}`);

  const response = await page.request.post(
    "/api/trpc/boardMember.add?batch=1",
    {
      data: {
        "0": {
          json: { boardPublicId, workspaceMemberPublicId: member.publicId },
        },
      },
    },
  );
  expect(response.ok()).toBe(true);
}

function commentEditor(page: Page): Locator {
  return page
    .locator("div")
    .filter({
      has: page.getByRole("heading", { name: "Activity", exact: true }),
    })
    .last()
    .locator('.tiptap[contenteditable="true"]');
}

async function insertMention(page: Page, editor: Locator, memberName: string) {
  const query = memberName.split(" ").at(-1) ?? memberName;
  await editor.pressSequentially(`@${query}`);
  await page
    .locator(".tippy-box")
    .locator("button")
    .filter({ hasText: memberName })
    .click();
}

async function startEditingComment(page: Page): Promise<Locator> {
  await page
    .getByRole("button", { name: "Comment options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Edit comment" }).click();

  return commentEditor(page).first();
}

async function saveComment(page: Page) {
  const updated = waitForTrpcMutation(page, "card.updateComment");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await updated;
}

test(
  "mention emails follow newly-added mention semantics",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    test.setTimeout(60_000);

    const author = { ...createTestUser(), name: "Mention Author" };
    const recipient = { ...createTestUser(), name: "Mention Recipient" };
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);

    await auth.signUp(author);
    await onboarding.createFirstWorkspace("Mention E2E Workspace");
    await dashboard.expectSignedInAs(author);

    await board.createBoard("Mention E2E Board");
    await board.createList("To do");
    await board.createCard("Mention email card");
    const boardUrl = page.url();

    await joinWorkspace(page, browser, recipient);
    // Mention emails only go to people who can see the board.
    const boardPublicId = boardUrl.split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not resolve board from URL");
    await addToBoard(page, boardPublicId, recipient.email);
    await page.goto(boardUrl);
    await board.openCard("Mention email card");
    await clearMailpitInbox();

    const newCommentEditor = commentEditor(page);
    await newCommentEditor.click();
    await newCommentEditor.pressSequentially("Please review this, ");
    await insertMention(page, newCommentEditor, recipient.name);

    const added = waitForTrpcMutation(page, "card.addComment");
    await page
      .getByRole("button", { name: "Submit comment", exact: true })
      .click();
    await added;
    await waitForMailpitMessageCount(recipient.email, 1);

    const preservedMentionEditor = await startEditingComment(page);
    await preservedMentionEditor.click();
    await preservedMentionEditor.press("End");
    await preservedMentionEditor.pressSequentially(" Follow-up text.");
    await saveComment(page);
    await expectMailpitMessageCountToRemain(recipient.email, 1);

    const removedMentionEditor = await startEditingComment(page);
    await removedMentionEditor.click();
    await page.keyboard.press("ControlOrMeta+A");
    await removedMentionEditor.pressSequentially("Mention removed.");
    await saveComment(page);

    const readdedMentionEditor = await startEditingComment(page);
    await readdedMentionEditor.click();
    await readdedMentionEditor.press("End");
    await readdedMentionEditor.pressSequentially(" Added again: ");
    await insertMention(page, readdedMentionEditor, recipient.name);
    await saveComment(page);
    await waitForMailpitMessageCount(recipient.email, 2);
  },
);
