import type { Page } from "@playwright/test";

export class StripeBillingPortalPage {
  constructor(private readonly page: Page) {}

  async scheduleCancellation() {
    await this.page.getByRole("link", { name: "Cancel subscription" }).click();
    await this.page.getByRole("button", { name: "Reason" }).click();
    await this.page
      .getByRole("option", { name: "I no longer need it" })
      .click();
    await this.page
      .getByRole("button", { name: "Continue to cancellation" })
      .click();
    await this.page
      .getByRole("button", { name: "Cancel subscription" })
      .click();
  }

  async returnToApp() {
    await this.page.getByRole("link", { name: /^Return to/ }).click();
  }
  async switchPlan() {
    await this.page.getByRole("link", { name: "Update subscription" }).click();
    await this.page.getByRole("button", { name: "Select" }).click();
    await this.page.getByRole("button", { name: "Continue" }).click();
    await this.page.getByRole("button", { name: "Subscribe and pay" }).click();
  }
}
