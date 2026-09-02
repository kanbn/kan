import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

async function attemptCreateWebhook(
  page: Page,
  workspacePublicId: string,
  url: string,
) {
  return page.request.post("/api/trpc/webhook.create?batch=1", {
    data: {
      "0": {
        json: {
          workspacePublicId,
          name: "SSRF test webhook",
          url,
          events: ["card.created"],
        },
      },
    },
  });
}

test(
  "the backend rejects non-HTTPS and loopback/private webhook URLs",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    const workspacePublicId = await page.evaluate(() =>
      localStorage.getItem("workspacePublicId"),
    );
    if (!workspacePublicId) {
      throw new Error("workspacePublicId not found in localStorage");
    }

    const cases = [
      "http://example.com/webhook",
      "https://localhost/webhook",
      "https://127.0.0.1/webhook",
      "https://192.168.1.1/webhook",
    ];

    for (const url of cases) {
      const response = await attemptCreateWebhook(page, workspacePublicId, url);
      expect(response.status(), `expected ${url} to be rejected`).toBe(400);
    }

    const listResponse = await page.request.get(
      `/api/trpc/webhook.list?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { workspacePublicId } } }),
      )}`,
    );
    const listBody = (await listResponse.json()) as [
      { result: { data: { json: unknown[] } } },
    ];
    expect(listBody[0].result.data.json).toHaveLength(0);
  },
);
