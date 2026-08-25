import type { Page } from "@playwright/test";

import type { TestUser } from "../test-user";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async expectSignedInAs(user: TestUser) {
    await this.page.getByRole("heading", { name: "Boards" }).waitFor();
    await this.page.getByRole("button", { name: user.name }).waitFor();
  }

  async logOut(user: TestUser) {
    await this.page.getByRole("button", { name: user.name }).click();
    await this.page.getByRole("menuitem", { name: "Logout" }).click();
    await this.page.waitForURL(/\/login/);
  }
}
