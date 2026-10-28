import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a board's URL slug can be changed",
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
    const boardPublicId = page.url().split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not resolve boardPublicId");

    const newSlug = `e2e-board-slug-${Date.now()}`;
    await board.updateBoardSlug(newSlug);

    const response = await page.request.get(
      `/api/trpc/board.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { boardPublicId } } }),
      )}`,
    );
    const body = (await response.json()) as [
      { result: { data: { json: { slug: string } } } },
    ];
    expect(body[0].result.data.json.slug).toBe(newSlug);
  },
);
