import type { Page } from "@playwright/test";

const TEST_CARD_NUMBER = "4242424242424242";

export class StripeCheckoutPage {
  constructor(private readonly page: Page) {}

  async payWithTestCard(email: string) {
    const emailField = this.page.getByRole("textbox", { name: "Email" });
    if (await emailField.count()) {
      await emailField.fill(email);
    }
    await this.page
      .getByRole("textbox", { name: "Card number" })
      .fill(TEST_CARD_NUMBER);
    await this.page.getByRole("textbox", { name: "Expiration" }).fill("12/34");
    await this.page.getByRole("textbox", { name: "CVC" }).fill("123");
    await this.page
      .getByRole("textbox", { name: "Cardholder name" })
      .fill("E2E Test");

    const country = this.page.getByRole("combobox", {
      name: "Country or region",
    });
    if (await country.count()) {
      await country.selectOption({ label: "United Kingdom" });
    }
    const postalCode = this.page.getByRole("textbox", { name: "Postal code" });
    if (await postalCode.count()) {
      await postalCode.fill("SW1A 1AA");
    }

    await this.page.getByRole("button", { name: "Start trial" }).click();
  }

  async cancel() {
    await this.page.getByRole("link", { name: /^Back to/ }).click();
  }
}
