import { expect, test } from "@playwright/test";

import {
    clearMailpitInbox,
    getResetPasswordUrl,
} from "../support/mailpit-client";
import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
    "a user can reset their password via the emailed reset link",
    { tag: "@self-hosted" },
    async ({ page }) => {
        const user = createTestUser();
        const newPassword = "NewPassword456!";
        const auth = new AuthPage(page);
        const onboarding = new SelfHostedOnboardingPage(page);
        const dashboard = new DashboardPage(page);

        await auth.signUp(user);
        await onboarding.createFirstWorkspace("E2E Test Workspace");
        await dashboard.expectSignedInAs(user);
        await dashboard.logOut(user);

        await clearMailpitInbox();

        await page.goto("/forgot-password");
        await page.getByPlaceholder("Enter your email address").fill(user.email);
        await page.getByRole("button", { name: "Send reset link" }).click();
        await page.getByText("Check your inbox").waitFor();

        const resetUrl = await getResetPasswordUrl(user.email);
        expect(resetUrl).toContain("/reset-password/");
        expect(resetUrl).not.toContain("/api/auth/");

        await page.goto(resetUrl);
        await page.getByPlaceholder("Enter a new password").fill(newPassword);
        await page
            .getByPlaceholder("Confirm your password")
            .fill(`${newPassword}x`);
        await page.getByRole("button", { name: "Reset password" }).click();
        await expect(page.getByText("Passwords do not match")).toBeVisible();

        await page.getByPlaceholder("Confirm your password").fill(newPassword);
        await page.getByRole("button", { name: "Reset password" }).click();
        await page.waitForURL(/\/login/, { timeout: 20_000 });

        await auth.logIn({ ...user, password: newPassword });
        await dashboard.expectSignedInAs(user);
    },
);
