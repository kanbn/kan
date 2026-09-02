import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

test(
  "a Trello board can be imported with its lists, cards, labels, and checklists",
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

    const authResponse = await page.request.post("/api/trello/authenticate", {
      data: { token: "mock-trello-token" },
    });
    expect(authResponse.ok()).toBe(true);

    await page.getByRole("button", { name: "Import" }).click();
    await page.getByRole("button", { name: "Select source" }).click();

    await page.getByText("Mock Trello Board", { exact: true }).click();
    const imported = waitForTrpcMutation(page, "import.trello.importBoards");
    await page.getByRole("button", { name: /^Import board/ }).click();
    await imported;

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByText("Mock Trello Board", { exact: true }).click();
    await page.waitForURL(/\/boards\/[^/]+$/);

    const listNameTextboxes = page.getByRole("textbox", {
      name: "List name",
    });
    await expect(listNameTextboxes).toHaveCount(2);
    const listNames = await listNameTextboxes.all();
    const values = await Promise.all(listNames.map((l) => l.inputValue()));
    expect(values).toEqual(["To Do", "Done"]);

    await expect(page.getByText("Fix login bug")).toBeVisible();
    await expect(page.getByText("Add dark mode")).toBeVisible();

    await board.openCard("Fix login bug");
    await expect(card.assignedLabelBadge("Bug")).toBeVisible();
    await expect(page.getByText("Reproduce issue")).toBeVisible();
    await expect(page.getByText("Write fix")).toBeVisible();
  },
);

test(
  "a batch import succeeds partially when one of the requested boards fails",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    const authResponse = await page.request.post("/api/trello/authenticate", {
      data: { token: "mock-trello-token" },
    });
    expect(authResponse.ok()).toBe(true);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    const response = await page.request.post(
      "/api/trpc/import.trello.importBoards?batch=1",
      {
        data: {
          "0": {
            json: {
              boardIds: ["mock-board-1", "does-not-exist"],
              workspacePublicId,
            },
          },
        },
      },
    );
    expect(response.ok()).toBe(true);

    const body = (await response.json()) as [
      { result: { data: { json: { boardsCreated: number } } } },
    ];
    expect(body[0].result.data.json.boardsCreated).toBe(1);

    await page.goto("/boards");
    await expect(
      page.getByText("Mock Trello Board", { exact: true }),
    ).toBeVisible();
  },
);
