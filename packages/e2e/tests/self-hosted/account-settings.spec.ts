import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 450×800 (9:16), the shape of a typical phone photo
const portraitAvatarFixture = path.join(
  __dirname,
  "../support/fixtures/portrait-avatar.png",
);

test(
  "a display name update reflects in the user menu",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await settings.open();
    await settings.updateDisplayName("Renamed User");

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Renamed User" }),
    ).toBeVisible();
  },
);

test(
  "the avatar crop dialog fits a phone screen for a portrait photo",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const settings = new SettingsPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);
    await settings.open();

    // iPhone 12 Pro's visible area in Safari
    await page.setViewportSize({ width: 390, height: 664 });
    await page.locator("input#single").setInputFiles(portraitAvatarFixture);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Crop your avatar")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeInViewport({
      ratio: 1,
    });

    // The crop percentages map onto the image box, so it must keep the photo's
    // aspect ratio while it is scaled down.
    const image = dialog.getByRole("img", { name: "Avatar to crop" });
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    if (!box) throw new Error("Crop image has no bounding box");
    expect(box.width / box.height).toBeCloseTo(450 / 800, 2);
  },
);
