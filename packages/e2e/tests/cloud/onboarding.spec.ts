import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { CloudOnboardingPage } from "../support/pages/cloud-onboarding-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { createTestUser } from "../support/test-user";

test(
  "a new cloud user can sign up, pick the solo plan, create a workspace, and reach their boards",
  { tag: "@cloud" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new CloudOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.completeSoloPlanOnboarding("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await expect(
      page.getByRole("button", { name: "New", exact: true }),
    ).toBeVisible();
  },
);
