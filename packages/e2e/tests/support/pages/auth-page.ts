import type { Page } from "@playwright/test";

import type { TestUser } from "../test-user";

export class AuthPage {
  constructor(private readonly page: Page) {}

  async signUp(user: TestUser) {
    await this.page.goto("/signup");
    await this.page.getByPlaceholder("Enter your name").fill(user.name);
    await this.page
      .getByPlaceholder("Enter your email address")
      .fill(user.email);
    await this.page.getByPlaceholder("Enter your password").fill(user.password);
    await this.page.getByRole("button", { name: "Sign up with email" }).click();
    await this.page.waitForURL((url) => !url.pathname.startsWith("/signup"));
  }

  async logIn(user: TestUser) {
    if (!this.page.url().includes("/login")) {
      await this.page.goto("/login");
    }
    await this.page
      .getByPlaceholder("Enter your email address")
      .fill(user.email);
    await this.page.getByPlaceholder("Enter your password").fill(user.password);
    await this.page
      .getByRole("button", { name: "Continue with email" })
      .click();
    await this.page.waitForURL(/\/boards/);
  }
}
