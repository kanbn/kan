import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const attachmentFixture = path.join(
  __dirname,
  "../support/fixtures/sample-attachment.txt",
);

test(
  "a file can be attached to a card, persists across reload, and can be deleted",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("E2E Test Board");
    await board.createList("To do");
    await board.createCard("Attachment test card");
    await board.openCard("Attachment test card");

    const attachmentItem = page.getByRole("button", {
      name: "Delete sample-attachment.txt",
    });

    await card.uploadAttachment(attachmentFixture);
    await expect(attachmentItem).toBeVisible();

    await page.reload();
    await expect(attachmentItem).toBeVisible();

    await card.deleteAttachment("sample-attachment.txt");
    await expect(attachmentItem).toHaveCount(0);
  },
);
