import { expect, request, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { SettingsPage } from "../support/pages/settings-page";
import { createTestUser } from "../support/test-user";

test(
  "an API key can be created and then revoked",
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
    await settings.goToTab("API");
    const apiKey = await settings.createApiKey("E2E Test Key");

    await expect(page.getByText("E2E Test Key")).toBeVisible();

    // The public REST API (/api/v1, used by API keys and the MCP server) is
    // proxied to apps/api. No cookies here, so only the key authenticates.
    const api = await request.newContext({
      baseURL: new URL(page.url()).origin,
    });
    const workspaces = await api.get("/api/v1/workspaces", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(workspaces.status()).toBe(200);
    expect(JSON.stringify(await workspaces.json())).toContain(
      "E2E Test Workspace",
    );
    const badKey = await api.get("/api/v1/workspaces", {
      headers: { Authorization: "Bearer kan_not_a_real_key" },
    });
    expect(badKey.status()).toBe(401);
    const spec = await api.get("/api/v1/openapi.json");
    expect(spec.status()).toBe(200);
    expect(await spec.json()).toHaveProperty("paths");
    await api.dispose();

    await settings.revokeApiKey();
    await expect(page.getByText("E2E Test Key")).toHaveCount(0);
  },
);
