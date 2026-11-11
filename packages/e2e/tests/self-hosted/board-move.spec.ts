import { expect, test } from "@playwright/test";

import { apiBaseURL } from "../support/api-base-url";
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
      `${apiBaseURL}/workspaces`,
      { data: { name: "Second Workspace" } },
    );
    expect(secondWorkspaceResponse.ok()).toBe(true);
    const { publicId: secondWorkspacePublicId } =
      (await secondWorkspaceResponse.json()) as { publicId: string };

    await board.createBoard("E2E Test Board");
    const boardPublicId = page.url().split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not resolve boardPublicId");

    await page.reload();
    await board.moveToWorkspace("Second Workspace");

    const response = await page.request.get(
      `${apiBaseURL}/boards/${boardPublicId}`,
    );
    const body = (await response.json()) as { workspace: { publicId: string } };
    expect(body.workspace.publicId).toBe(secondWorkspacePublicId);
  },
);
