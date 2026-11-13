import type { Locator, Page } from "@playwright/test";

const TEST_CARD_NUMBER = "4242424242424242";

type Role = Parameters<Page["getByRole"]>[0];

export class StripeCheckoutPage {
  constructor(private readonly page: Page) {}

  // Stripe Checkout renders its form inside (possibly nested) iframes, so look in every frame.
  private async find(
    role: Role,
    name: string | RegExp,
  ): Promise<Locator | null> {
    for (const frame of this.page.frames()) {
      const locator = frame.getByRole(role, { name }).first();
      if (await locator.isVisible().catch(() => false)) return locator;
    }
    return null;
  }

  private async findRequired(
    role: Role,
    name: string | RegExp,
    timeout = 30_000,
  ): Promise<Locator> {
    const deadline = Date.now() + timeout;
    for (;;) {
      const locator = await this.find(role, name);
      if (locator) return locator;
      if (Date.now() > deadline) {
        const snapshots = await Promise.all(
          this.page.frames().map((frame) =>
            frame
              .locator("body")
              .ariaSnapshot()
              .catch(() => "(unreadable)"),
          ),
        );
        throw new Error(
          `Stripe checkout: no ${role} "${String(name)}" at ${this.page.url()}\n${snapshots.join("\n---\n")}`,
        );
      }
      await this.page.waitForTimeout(250);
    }
  }

  async payWithTestCard(email: string) {
    const deadline = Date.now() + 30_000;
    let cardNumber = await this.find("textbox", "Card number");
    while (!cardNumber && Date.now() < deadline) {
      const cardOption = await this.find("radio", /^card$/i);
      if (cardOption) await cardOption.click();
      await this.page.waitForTimeout(250);
      cardNumber = await this.find("textbox", "Card number");
    }
    cardNumber ??= await this.findRequired("textbox", "Card number", 0);

    const emailField = await this.find("textbox", "Email");
    if (await emailField?.isEditable()) await emailField?.fill(email);
    await cardNumber.fill(TEST_CARD_NUMBER);
    await (await this.findRequired("textbox", "Expiration")).fill("12/34");
    await (await this.findRequired("textbox", "CVC")).fill("123");
    await (await this.find("textbox", "Cardholder name"))?.fill("E2E Test");
    await (
      await this.find("combobox", "Country or region")
    )?.selectOption({ label: "United Kingdom" });
    await (await this.find("textbox", "Postal code"))?.fill("SW1A 1AA");

    await (await this.findRequired("button", "Start trial")).click();
  }

  async cancel() {
    await this.page.getByRole("link", { name: /^Back to/ }).click();
  }
}
