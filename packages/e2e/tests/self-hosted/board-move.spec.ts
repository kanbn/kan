import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a board can be moved to another workspace",
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

    const secondWorkspaceResponse = await page.request.post(
      "/api/trpc/workspace.create?batch=1",
      { data: { "0": { json: { name: "Second Workspace" } } } },
    );
    expect(secondWorkspaceResponse.ok()).toBe(true);
    const secondWorkspaceBody = (await secondWorkspaceResponse.json()) as [
      { result: { data: { json: { publicId: string } } } },
    ];
    const secondWorkspacePublicId =
      secondWorkspaceBody[0].result.data.json.publicId;

    await board.createBoard("E2E Test Board");
    const boardPublicId = page.url().split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not resolve boardPublicId");

    await page.reload();
    await board.moveToWorkspace("Second Workspace");

    const response = await page.request.get(
      `/api/trpc/board.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { boardPublicId } } }),
      )}`,
    );
    const body = (await response.json()) as [
      { result: { data: { json: { workspace: { publicId: string } } } } },
    ];
    expect(body[0].result.data.json.workspace.publicId).toBe(
      secondWorkspacePublicId,
    );
  },
);
