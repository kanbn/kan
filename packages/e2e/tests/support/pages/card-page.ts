import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForTrpcMutation } from "../wait-for-trpc";

export class CardPage {
  constructor(private readonly page: Page) {}

  async editTitle(title: string) {
    const titleInput = this.page.locator("#title");
    await titleInput.fill(title);
    await titleInput.blur();
  }
  private currentListTrigger() {
    return this.page
      .locator('[aria-label="Current list"]')
      .filter({ visible: true });
  }

  async moveToList(targetListName: string) {
    await this.currentListTrigger().click();
    const updated = waitForTrpcMutation(this.page, "card.update");
    await this.page
      .getByRole("checkbox", { name: targetListName })
      .filter({ visible: true })
      .click();
    await updated;
  }

  async expectCurrentList(listName: string) {
    await this.page.reload();
    await expect(this.currentListTrigger()).toHaveText(listName);
  }

  async delete() {
    await this.page
      .getByRole("button", { name: "Card options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Delete card" }).click();
    await this.page
      .getByRole("button", { name: "Delete", exact: true })
      .click();
  }
}
