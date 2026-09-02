import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForTrpcMutation } from "../wait-for-trpc";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page
      .getByRole("link", { name: "Settings", exact: true })
      .click();
    await this.page.waitForURL(/\/settings/);
  }

  async goToTab(tabName: string) {
    await this.page.getByRole("link", { name: tabName, exact: true }).click();
    await this.page.waitForURL(new RegExp(`/settings/`));
  }

  async updateWorkspaceName(name: string) {
    await this.page.getByRole("textbox", { name: "Workspace name" }).fill(name);
    const updated = waitForTrpcMutation(this.page, "workspace.update");
    await this.page.getByRole("button", { name: "Update" }).click();
    await updated;
  }

  async updateDisplayName(name: string) {
    await this.page.getByRole("textbox", { name: "Display name" }).fill(name);
    const updated = waitForTrpcMutation(this.page, "user.update");
    await this.page.getByRole("button", { name: "Update" }).click();
    await updated;
  }

  private async fillAvailableWorkspaceSlug(slug: string) {
    await this.page.getByRole("textbox", { name: "Workspace URL" }).fill(slug);
    await expect(
      this.page.getByRole("button", { name: "Update" }),
    ).toBeEnabled();
  }

  async updateWorkspaceSlug(slug: string) {
    await this.fillAvailableWorkspaceSlug(slug);
    const updated = waitForTrpcMutation(this.page, "workspace.update");
    await this.page.getByRole("button", { name: "Update" }).click();
    await updated;
  }

  async attemptWorkspaceSlugUpdate(slug: string) {
    await this.fillAvailableWorkspaceSlug(slug);
    await this.page.getByRole("button", { name: "Update" }).click();
    await this.page.waitForURL(/\/upgrade\/select-plan/);
  }

  getWorkspaceSlugValue() {
    return this.page
      .getByRole("textbox", { name: "Workspace URL" })
      .inputValue();
  }

  async createApiKey(name: string) {
    await this.page.getByRole("button", { name: "Create new key" }).click();
    await this.page.getByPlaceholder("API key name").fill(name);
    await this.page.getByRole("button", { name: "Create API key" }).click();
    const dialog = this.page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "API key created" }).waitFor();
    await dialog.getByRole("button", { name: "Close" }).click();
  }

  async revokeApiKey() {
    await this.page
      .getByRole("button", { name: "API key options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Revoke" }).click();
    await this.page.getByRole("checkbox").check();
    await this.page.getByRole("button", { name: "Revoke API key" }).click();
  }

  async createWebhook(name: string, url: string) {
    await this.page.getByRole("button", { name: "Add webhook" }).click();

    const dialog = this.page.getByRole("dialog");
    await dialog.getByPlaceholder("My webhook").fill(name);
    await dialog.getByPlaceholder("https://example.com/webhook").fill(url);

    const created = waitForTrpcMutation(this.page, "webhook.create");
    await dialog.getByRole("button", { name: "Create webhook" }).click();
    await created;

    await expect(dialog).toHaveCount(0);
  }

  async deleteWebhook() {
    await this.page
      .getByRole("button", { name: "Webhook options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Delete" }).click();

    const deleted = waitForTrpcMutation(this.page, "webhook.delete");
    await this.page
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await deleted;
  }
}
