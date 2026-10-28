import type { Page } from "@playwright/test";

export class SelfHostedOnboardingPage {
  constructor(private readonly page: Page) {}

  async createFirstWorkspace(name: string) {
    await this.page.getByRole("heading", { name: "New workspace" }).waitFor();
    await this.page.getByPlaceholder("Workspace name").fill(name);
    await this.page.getByRole("button", { name: "Create workspace" }).click();
    await this.page
      .getByRole("heading", { name: "New workspace" })
      .waitFor({ state: "hidden" });
  }
}
