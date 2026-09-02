import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForTrpcMutation } from "../wait-for-trpc";

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

  async inviteByEmail(email: string) {
    await this.openInviteModal();

    const dialog = this.page.getByRole("dialog");
    await dialog.getByPlaceholder("Email").fill(email);

    const invited = waitForTrpcMutation(this.page, "member.invite");
    await dialog.getByRole("button", { name: "Invite member" }).click();
    await invited;

    await expect(dialog).toHaveCount(0);
  }

  async changeRole(memberEmail: string, role: "admin" | "member" | "guest") {
    const row = this.page.getByRole("row", { name: new RegExp(memberEmail) });
    const updated = waitForTrpcMutation(this.page, "member.updateRole");
    await row.getByRole("combobox").selectOption(role);
    await updated;
  }

  async removeMember(memberEmail: string) {
    const row = this.page.getByRole("row", { name: new RegExp(memberEmail) });
    await row
      .getByRole("button", { name: "Member options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Remove member" }).click();

    const removed = waitForTrpcMutation(this.page, "member.delete");
    await this.page
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await removed;
  }
}
