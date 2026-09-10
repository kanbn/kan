import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import { waitForTrpcMutation } from "../support/wait-for-trpc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imageFixture = path.join(
  __dirname,
  "../../../../apps/web/public/testimonials/avatars/fox.png",
);

async function openBackgroundDialog(page: Page) {
  await page
    .getByRole("button", { name: "Board options", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Change background" }).click();
  await page.getByRole("heading", { name: "Change background" }).waitFor();
}

async function getBoardSlug(page: Page, boardPublicId: string) {
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
  "board backgrounds persist on boards, dashboard tiles, and public views",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    test.setTimeout(90_000);

    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Background Workspace");
    await dashboard.expectSignedInAs(user);
    await board.createBoard("E2E Background Board");

    const boardPublicId = page.url().split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not parse board public ID");

    await openBackgroundDialog(page);
    const colourUpdated = waitForTrpcMutation(page, "board.update");
    await page.getByRole("button", { name: "Blue", exact: true }).click();
    await colourUpdated;
    await expect(page.locator('[data-board-background="colour"]')).toHaveCSS(
      "background-color",
      "rgb(2, 132, 199)",
    );

    await page.goto("/boards");
    const boardTile = page.getByRole("link", { name: /E2E Background Board/ });
    await expect(
      boardTile.locator('[data-board-background="colour"]'),
    ).toBeVisible();

    await boardTile.click();
    await openBackgroundDialog(page);
    const confirmed = waitForTrpcMutation(page, "boardBackground.confirm");
    await page
      .getByRole("dialog")
      .locator('input[type="file"]')
      .setInputFiles(imageFixture);
    await confirmed;

    const imageBackground = page.locator('[data-board-background="image"]');
    await expect(imageBackground.locator("img")).toBeVisible();
    await page.reload();
    await expect(imageBackground.locator("img")).toBeVisible();

    const boardSlug = await getBoardSlug(page, boardPublicId);
    await page.getByRole("button", { name: "Visibility" }).click();
    await page
      .getByRole("checkbox", { name: "Public" })
      .filter({ visible: true })
      .click();
    await page.keyboard.press("Escape");

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId)
      throw new Error("workspacePublicId not found in localStorage");

    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(`/${workspacePublicId}/${boardSlug}`);
    await expect(
      anonymousPage.locator('[data-board-background="image"] img'),
    ).toBeVisible();
    await anonymousContext.close();

    await openBackgroundDialog(page);
    const removed = waitForTrpcMutation(page, "board.update");
    await page.getByRole("button", { name: "Remove background" }).click();
    await removed;
    await expect(page.locator("[data-board-background]")).toHaveCount(0);
  },
);
