import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

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

test(
  "inline code and code blocks use a monospace font",
  { tag: "@self-hosted" },
  async ({ page }) => {
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
    await board.createCard("Markdown code font card");
    await board.openCard("Markdown code font card");

    const description = page.locator('.tiptap[contenteditable="true"]').first();
    await pastePlainText(
      description,
      [
        "Use `inline code` in a sentence.",
        "",
        "```ts",
        "const answer = 42;",
        "```",
      ].join("\n"),
    );

    const inlineCode = description.locator("p code");
    const codeBlock = description.locator("pre code");

    await expect(inlineCode).toHaveText("inline code");
    await expect(codeBlock).toContainText("const answer = 42;");

    for (const code of [inlineCode, codeBlock]) {
      await expect
        .poll(() =>
          code.evaluate((element) => getComputedStyle(element).fontFamily),
        )
        .toMatch(/mono|courier/i);
    }
  },
);
