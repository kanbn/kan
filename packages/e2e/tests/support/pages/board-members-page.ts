import type { Page } from "@playwright/test";

import { waitForResponsePath } from "../wait-for-trpc";

export class BoardMembersPage {
  constructor(private readonly page: Page) {}

  async addMember(memberEmail: string) {
    await this.page.getByRole("button", { name: "Add member" }).click();

    const dialog = this.page.getByRole("dialog");
    const select = dialog.getByLabel("Workspace member");
    const optionValue = await select
      .locator("option", { hasText: memberEmail })
      .getAttribute("value");
    if (!optionValue) {
      throw new Error(`No workspace member option found for ${memberEmail}`);
    }
    await select.selectOption(optionValue);

    const added = waitForResponsePath(this.page, "/members");
    await dialog.getByRole("button", { name: "Add member" }).click();
    await added;
  }

  async changeRole(memberEmail: string, role: "admin" | "member") {
    const row = this.page.getByRole("row", { name: new RegExp(memberEmail) });
    const updated = waitForResponsePath(this.page, "/members/", "PUT");
    await row.getByRole("combobox").selectOption(role);
    await updated;
  }

  async removeMember(memberEmail: string) {
    const row = this.page.getByRole("row", { name: new RegExp(memberEmail) });
    await row
      .getByRole("button", { name: "Board member options", exact: true })
      .click();
    await this.page
      .getByRole("menuitem", { name: "Remove from board" })
      .click();

    const removed = waitForResponsePath(this.page, "/members/", "DELETE");
    await this.page
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await removed;
  }
}
