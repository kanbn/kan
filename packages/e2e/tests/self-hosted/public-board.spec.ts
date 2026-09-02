import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

async function getBoardSlug(page: Page) {
  const boardPublicId = page.url().split("/boards/")[1];
  if (!boardPublicId) {
    throw new Error("Could not parse boardPublicId from current URL");
  }

  const response = await page.request.get(
    `/api/trpc/board.byId?batch=1&input=${encodeURIComponent(
      JSON.stringify({ "0": { json: { boardPublicId } } }),
    )}`,
  );
  const body = (await response.json()) as [
    { result: { data: { json: { slug: string } } } },
  ];
  return body[0].result.data.json.slug;
}

test(
  "a public board can be viewed anonymously, and a private board can't",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    await board.createBoard("Public Board Test");
    await board.createList("To do");
    await board.createCard("Visible to anyone");
    const publicBoardSlug = await getBoardSlug(page);

    await page.getByRole("button", { name: "Visibility" }).click();
    await page
      .getByRole("checkbox", { name: "Public" })
      .filter({ visible: true })
      .click();

    await page.goto("/boards");
    await board.createBoard("Private Board Test");
    const privateBoardSlug = await getBoardSlug(page);

    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    await anonPage.goto(`/${workspacePublicId}/${publicBoardSlug}`);
    await expect(
      anonPage.getByRole("heading", { name: "Public Board Test" }),
    ).toBeVisible();
    await expect(anonPage.getByText("Visible to anyone")).toBeVisible();

    await anonPage.goto(`/${workspacePublicId}/${privateBoardSlug}`);
    await expect(anonPage.getByText("Board not found")).toBeVisible();

    await anonContext.close();
  },
);
