import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class MembersPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.getByRole("link", { name: "Members", exact: true }).click();
    await this.page.waitForURL(/\/members/);
  }

  async openInviteModal() {
    await this.page
      .getByRole("button", { name: "Invite", exact: true })
      .click();
  }

  async createInviteLink(): Promise<string> {
    await this.openInviteModal();
    await this.page.getByRole("switch", { name: "Create invite link" }).click();

    const linkInput = this.page.getByRole("dialog").locator("input[readonly]");
    await expect(linkInput).not.toHaveValue("");
    const link = await linkInput.inputValue();

    await this.page.keyboard.press("Escape");
    await expect(this.page.getByRole("dialog")).toHaveCount(0);

    return link;
  }
}
