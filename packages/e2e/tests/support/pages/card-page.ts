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

  private labelSelectorTrigger() {
    return this.page.locator('[aria-label="Labels"]').filter({ visible: true });
  }

  assignedLabelBadge(name: string) {
    return this.labelSelectorTrigger().getByText(name, { exact: true }).last();
  }

  async createAndAssignLabel(name: string) {
    await this.labelSelectorTrigger().click();
    await this.page.getByRole("button", { name: "Create new label" }).click();

    const dialog = this.page.getByRole("dialog");
    await dialog.getByPlaceholder("Name").fill(name);
    const created = waitForTrpcMutation(this.page, "label.create");
    const assigned = waitForTrpcMutation(this.page, "card.addOrRemoveLabel");
    await dialog.getByRole("button", { name: "Create label" }).click();
    await created;
    await assigned;
  }
}
