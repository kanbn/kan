import { test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "a signed-up user can log out and log back in",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await dashboard.logOut(user);

    await auth.logIn(user);
    await dashboard.expectSignedInAs(user);
  },
);
