import { expect, test } from "@playwright/test";

import {
  hasRealStripeCredentials,
  setupStripeWebhookForwarding,
  signUpAndUpgradeToTeam,
} from "../support/cloud-billing";
import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

setupStripeWebhookForwarding();

test(
  "a team workspace can't claim another workspace's publicId as its own custom slug",
  { tag: "@cloud" },
  async ({ page, browser }) => {
    test.skip(
      !hasRealStripeCredentials,
      "Requires a real Stripe test-mode STRIPE_SECRET_KEY and the Stripe CLI to forward webhooks",
    );
    test.setTimeout(60_000);

    const userAContext = await browser.newContext();
    const userAPage = await userAContext.newPage();
    const userA = createTestUser();
    await new AuthPage(userAPage).signUp(userA);
    await new CloudOnboardingPage(userAPage).completeSoloPlanOnboarding(
      "Workspace A",
    );
    await new DashboardPage(userAPage).expectSignedInAs(userA);
    const workspacePublicIdA = await userAPage.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicIdA) {
      throw new Error("workspacePublicId not found in localStorage");
    }
    await userAContext.close();

    const userB = createTestUser();
    const settingsB = new SettingsPage(page);

    await signUpAndUpgradeToTeam(page, userB);
    await settingsB.goToTab("Workspace");

    await page
      .getByRole("textbox", { name: "Workspace URL" })
      .fill(workspacePublicIdA);
    await expect(
      page.getByText("This workspace username has already been taken"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Update" })).toBeDisabled();

    const workspacePublicIdB = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    const response = await page.request.post(
      "/api/trpc/workspace.update?batch=1",
      {
        data: {
          "0": {
            json: {
              workspacePublicId: workspacePublicIdB,
              slug: workspacePublicIdA,
            },
          },
        },
      },
    );
    expect(response.status()).toBe(409);
    const body = (await response.json()) as [
      { error: { json: { message: string } } },
    ];
    expect(body[0].error.json.message).toBe("Workspace slug already taken");
  },
);
