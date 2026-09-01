import type { Page } from "@playwright/test";

import { waitForTrpcMutation } from "../wait-for-trpc";

export class BoardPage {
  constructor(private readonly page: Page) {}

  async createBoard(name: string) {
    await this.page.getByRole("button", { name: "New", exact: true }).click();
    await this.page.getByRole("heading", { name: "New board" }).waitFor();
    await this.page.getByPlaceholder("Name", { exact: true }).fill(name);
    await this.page.getByRole("button", { name: "Create board" }).click();
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
}
