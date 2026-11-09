import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

test(
  "editing the description right after the title save keeps both edits",
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

    await board.createBoard("Card race test board");
    await board.createList("To do");
    await board.createCard("Card race test card");
    await board.openCard("Card race test card");

    const cardPublicId = page.url().split("/cards/")[1];
    if (!cardPublicId) throw new Error("Could not resolve cardPublicId");

    // Hold the title save so the description can be edited while it's still pending.
    let releaseTitleSave: () => void = () => undefined;
    const titleSaveGate = new Promise<void>((resolve) => {
      releaseTitleSave = resolve;
    });
    await page.route(/\/api\/trpc\/card\.update/, async (route) => {
      await titleSaveGate;
      await route.continue();
    });

    const titleInput = page.locator("#title");
    await titleInput.fill("Card race test card v2");

    const titleSaved = waitForTrpcMutation(page, "card.update");

    // Clicking into the description blurs and saves the (now gated) title.
    const description = page
      .locator('.tiptap[contenteditable="true"]')
      .first();
    await description.click();
    await description.pressSequentially("new description text");

    releaseTitleSave();
    await titleSaved;

    // Give the card.byId refetch the save just triggered a moment to resolve.
    await page.waitForTimeout(500);

    const descriptionSaved = waitForTrpcMutation(page, "card.update");
    await titleInput.click();
    await descriptionSaved;

    const cardResponse = await page.request.get(
      `/api/trpc/card.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { cardPublicId } } }),
      )}`,
    );
    const cardBody = (await cardResponse.json()) as [
      { result: { data: { json: { title: string; description: string } } } },
    ];
    const cardJson = cardBody[0].result.data.json;

    expect(cardJson.title).toBe("Card race test card v2");
    expect(cardJson.description).toContain("new description text");
  },
);
