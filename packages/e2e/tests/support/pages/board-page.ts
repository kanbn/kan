import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForTrpcMutation, waitForTrpcQuery } from "../wait-for-trpc";

export class BoardPage {
  constructor(private readonly page: Page) {}

  async createBoard(name: string) {
    await this.page.getByRole("button", { name: "New", exact: true }).click();
    await this.page.getByRole("heading", { name: "New board" }).waitFor();
    await this.page.getByPlaceholder("Name", { exact: true }).fill(name);
    await this.page.getByRole("button", { name: "Create board" }).click();
    await this.page.waitForURL(/\/boards\/[^/]+$/);
  }

  async createBoardFromTemplate(name: string, templateName: string) {
    await this.page.getByRole("button", { name: "New", exact: true }).click();
    await this.page.getByRole("heading", { name: "New board" }).waitFor();
    await this.page.getByPlaceholder("Name", { exact: true }).fill(name);
    await this.page.getByRole("switch", { name: "Use template" }).click();
    await this.page.getByText(templateName, { exact: true }).click();
    const created = waitForTrpcMutation(this.page, "board.create");
    await this.page.getByRole("button", { name: "Create board" }).click();
    await created;
    await this.page.waitForURL(/\/boards\/[^/]+$/);
  }

  async createList(name: string) {
    await this.page.getByRole("button", { name: "New list" }).click();
    await this.page.getByPlaceholder("List name").fill(name);
    const created = waitForTrpcMutation(this.page, "list.create");
    await this.page.getByRole("button", { name: "Create list" }).click();
    await this.page
      .getByRole("heading", { name: "New list" })
      .waitFor({ state: "hidden" });
    await created;
    await this.page.waitForLoadState("networkidle");
  }

  async createCard(title: string, listName?: string) {
    const scope = listName
      ? this.page.getByRole("button", { name: listName })
      : this.page;
    await scope.getByRole("button", { name: "Add card", exact: true }).click();
    await this.page.getByPlaceholder("Card title").fill(title);
    const created = waitForTrpcMutation(this.page, "card.create");
    await this.page.getByRole("button", { name: "Create card" }).click();
    await this.page
      .getByRole("heading", { name: "New card" })
      .waitFor({ state: "hidden" });
    await created;
    await this.page.waitForLoadState("networkidle");
  }

  async openCard(title: string) {
    await this.page.getByText(title, { exact: true }).click();
    await this.page.waitForURL(/\/cards\/[^/]+$/);
    await this.page
      .getByRole("button", { name: "Card options", exact: true })
      .waitFor();
  }

  async renameList(newName: string) {
    const input = this.page.getByRole("textbox", { name: "List name" });
    await input.fill(newName);
    await input.blur();
  }

  async deleteList() {
    await this.page
      .getByRole("button", { name: "List options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Delete list" }).click();
    await this.page
      .getByRole("button", { name: "Delete", exact: true })
      .click();
  }

  async renameBoard(newName: string) {
    const input = this.page.getByRole("textbox", { name: "Board name" });
    await input.fill(newName);
    await input.blur();
  }

  async archiveBoard() {
    await this.page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Archive board" }).click();
  }

  async deleteBoard() {
    await this.page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Delete board" }).click();
    await this.page
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await this.page.waitForURL(/\/boards$/);
  }

  async makeTemplate() {
    await this.page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Make template" }).click();

    const dialog = this.page.getByRole("dialog");
    const created = waitForTrpcMutation(this.page, "board.create");
    await dialog
      .getByRole("button", { name: "Create template", exact: true })
      .click();
    await created;
    await this.page.waitForURL(/\/templates\/[^/]+$/);
  }

  async updateBoardSlug(newSlug: string) {
    await this.page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Edit board URL" }).click();

    const dialog = this.page.getByRole("dialog");
    await dialog.locator("#board-slug").fill(newSlug);
    await expect(
      dialog.getByRole("button", { name: "Update", exact: true }),
    ).toBeEnabled();

    const updated = waitForTrpcMutation(this.page, "board.update");
    await dialog.getByRole("button", { name: "Update", exact: true }).click();
    await updated;
  }

  async moveToWorkspace(workspaceName: string) {
    await this.page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await this.page
      .getByRole("menuitem", { name: "Move to workspace" })
      .click();

    const dialog = this.page.getByRole("dialog");
    await dialog.getByRole("combobox").selectOption({ label: workspaceName });

    const moved = waitForTrpcMutation(this.page, "board.move");
    await dialog
      .getByRole("button", { name: "Move board", exact: true })
      .click();
    await moved;
  }

  async duplicateCard(cardTitle: string, targetListName: string) {
    await this.page
      .getByText(cardTitle, { exact: true })
      .click({ button: "right" });
    await this.page.getByRole("button", { name: "Duplicate card" }).click();

    const dialog = this.page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Select a list" }).click();
    await this.page.getByRole("option", { name: targetListName }).click();

    const duplicated = waitForTrpcMutation(this.page, "card.duplicate");
    await dialog
      .getByRole("button", { name: "Duplicate", exact: true })
      .click();
    await duplicated;
  }

  async filterByLabel(labelName: string) {
    await this.page
      .getByRole("button", { name: "Filter", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Labels" }).click();

    const updated = waitForTrpcQuery(this.page, "board.byId");
    await this.page
      .getByRole("checkbox", { name: labelName })
      .filter({ visible: true })
      .click();
    await updated;
    await this.page.keyboard.press("Escape");
  }
}
