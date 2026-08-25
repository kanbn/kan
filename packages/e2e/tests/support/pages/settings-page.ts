import type { Page } from "@playwright/test";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page
      .getByRole("link", { name: "Settings", exact: true })
      .click();
    await this.page.waitForURL(/\/settings/);
  }
}
