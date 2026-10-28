import type { Page } from "@playwright/test";

export class CloudOnboardingPage {
  constructor(private readonly page: Page) {}

  async completeSoloPlanOnboarding(workspaceName: string) {
    await this.page.waitForURL(/\/onboarding\/select-plan/);
    await this.page
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    await this.page.waitForURL(/\/onboarding\/workspace/);
    await this.page.getByPlaceholder("Workspace name").fill(workspaceName);
    await this.page
      .getByRole("button", { name: "Continue", exact: true })
      .click();

    await this.page.waitForURL(/\/boards/);
  }
}
