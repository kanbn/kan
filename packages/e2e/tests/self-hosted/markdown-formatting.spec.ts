import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

async function pastePlainText(locator: Locator, value: string) {
  await locator.click();
  await locator.evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, value);
}

async function setupCard(page: Page) {
  const user = createTestUser();
  const auth = new AuthPage(page);
  const onboarding = new SelfHostedOnboardingPage(page);
  const dashboard = new DashboardPage(page);
  const board = new BoardPage(page);

  await auth.signUp(user);
  await onboarding.createFirstWorkspace("E2E Test Workspace");
  await dashboard.expectSignedInAs(user);
  await board.createBoard("E2E Test Board");
  await board.createList("To do");
  await board.createCard("Markdown formatting card");
  await board.openCard("Markdown formatting card");
}

async function expectDescriptionFormatting(description: Locator) {
  await expect(description.locator("h1")).toHaveText("Release notes");
  await expect(description.locator("strong")).toHaveText("bold text");
  await expect(description.locator("em")).toHaveText("italic text");
  await expect(description.locator("ul li")).toHaveText(["first", "second"]);
  await expect(description.locator("blockquote")).toHaveText("quoted text");
  await expect(description.locator("p code")).toHaveText("inline code");
  await expect(description.locator("pre code")).toContainText(
    "const answer = 42;",
  );
  await expect(description.locator('a[href="https://example.com"]')).toHaveText(
    "documentation",
  );
}

async function expectPastedCommentFormatting(comment: Locator) {
  await expect(comment.locator("h1,h2,h3")).toHaveCount(0);
  await expect(comment.locator("p").first()).toHaveText("Comment heading");
  await expect(comment.locator("strong")).toHaveText("bold comment");
  await expect(comment.locator("code")).toHaveText("comment code");
  await expect(comment.locator('a[href="https://example.org"]')).toHaveText(
    "comment link",
  );
}

test(
  "markdown formatting persists in descriptions and comments",
  { tag: "@self-hosted" },
  async ({ page }) => {
    await setupCard(page);
    const cardPublicId = page.url().split("/cards/")[1];
    if (!cardPublicId) throw new Error("Could not resolve cardPublicId");

    const description = page.locator('.tiptap[contenteditable="true"]').first();
    await pastePlainText(
      description,
      [
        "# Release notes",
        "",
        "**bold text** and *italic text* and `inline code`",
        "",
        "- first",
        "- second",
        "",
        "> quoted text",
        "",
        "[documentation](https://example.com)",
        "",
        "```ts",
        "const answer = 42;",
        "```",
      ].join("\n"),
    );
    await expectDescriptionFormatting(description);

    const updated = waitForTrpcMutation(page, "card.update");
    await page.locator("#title").click();
    await updated;
    await page.reload();

    await expectDescriptionFormatting(
      page.locator('.tiptap[contenteditable="true"]').first(),
    );

    const commentEditor = page
      .locator('.tiptap[contenteditable="true"]')
      .last();
    await pastePlainText(
      commentEditor,
      [
        "# Comment heading",
        "",
        "**bold comment** and `comment code`",
        "",
        "[comment link](https://example.org)",
      ].join("\n"),
    );
    await expectPastedCommentFormatting(commentEditor);

    const addedPastedComment = waitForTrpcMutation(page, "card.addComment");
    await page
      .getByRole("button", { name: "Submit comment", exact: true })
      .click();
    await addedPastedComment;

    const pastedComment = page
      .locator('.tiptap[contenteditable="false"]')
      .filter({ hasText: "bold comment" });
    await expectPastedCommentFormatting(pastedComment);

    await commentEditor.click();
    await commentEditor.pressSequentially("**typed bold** ");
    await page.keyboard.press("Enter");
    await commentEditor.pressSequentially("`typed code` ");
    await expect(commentEditor.locator("strong")).toHaveText("typed bold");
    await expect(commentEditor.locator("code")).toHaveText("typed code");

    const addedTypedComment = waitForTrpcMutation(page, "card.addComment");
    await page
      .getByRole("button", { name: "Submit comment", exact: true })
      .click();
    await addedTypedComment;
    await page.reload();

    const typedComment = page
      .locator('.tiptap[contenteditable="false"]')
      .filter({ hasText: "typed bold" });
    await expect(typedComment.locator("strong")).toHaveText("typed bold");
    await expect(typedComment.locator("code")).toHaveText("typed code");

    const rawMarkdownResponse = await page.request.post(
      "/api/trpc/card.update?batch=1",
      {
        data: {
          "0": {
            json: {
              cardPublicId,
              description: [
                "# Imported notes",
                "",
                "**raw bold text**",
                "",
                "[raw link](https://example.net)",
              ].join("\n"),
            },
          },
        },
      },
    );
    expect(rawMarkdownResponse.ok()).toBe(true);
    await page.reload();

    const importedDescription = page
      .locator('.tiptap[contenteditable="true"]')
      .first();
    await expect(importedDescription.locator("h1")).toHaveText(
      "Imported notes",
    );
    await expect(importedDescription.locator("strong")).toHaveText(
      "raw bold text",
    );
    await expect(
      importedDescription.locator('a[href="https://example.net"]'),
    ).toHaveText("raw link");
  },
);
