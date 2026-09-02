import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForResponsePath, waitForTrpcMutation } from "../wait-for-trpc";

export class CardPage {
  constructor(private readonly page: Page) {}

  async editTitle(title: string) {
    const titleInput = this.page.locator("#title");
    await titleInput.fill(title);
    await titleInput.blur();
  }

  async editDescription(text: string) {
    const editor = this.page.locator('.tiptap[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially(text);

    const updated = waitForTrpcMutation(this.page, "card.update");
    await this.page.locator("#title").click();
    await updated;
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

  async uploadAttachment(filePath: string) {
    const uploaded = waitForResponsePath(this.page, "/api/upload/attachment");
    await this.page.setInputFiles("#attachment-upload", filePath);
    await uploaded;
  }

  async deleteAttachment(filename: string) {
    const deleted = waitForTrpcMutation(this.page, "attachment.delete");
    await this.page.getByRole("button", { name: `Delete ${filename}` }).click();
    await deleted;
  }

  private activitySection() {
    return this.page
      .locator("div")
      .filter({
        has: this.page.getByRole("heading", { name: "Activity", exact: true }),
      })
      .last();
  }

  private editableCommentEditor() {
    return this.activitySection().locator('.tiptap[contenteditable="true"]');
  }

  async addComment(text: string) {
    const editor = this.editableCommentEditor();
    await editor.click();
    await editor.pressSequentially(text);
    const added = waitForTrpcMutation(this.page, "card.addComment");
    await this.page
      .getByRole("button", { name: "Submit comment", exact: true })
      .click();
    await added;
  }

  async editComment(newText: string) {
    await this.page
      .getByRole("button", { name: "Comment options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Edit comment" }).click();

    const editor = this.editableCommentEditor().first();
    await editor.click();
    await this.page.keyboard.press("ControlOrMeta+A");
    await editor.pressSequentially(newText);

    const updated = waitForTrpcMutation(this.page, "card.updateComment");
    await this.page.getByRole("button", { name: "Save", exact: true }).click();
    await updated;
  }

  async deleteComment() {
    await this.page
      .getByRole("button", { name: "Comment options", exact: true })
      .click();
    await this.page.getByRole("menuitem", { name: "Delete comment" }).click();

    const deleted = waitForTrpcMutation(this.page, "card.deleteComment");
    await this.page
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await deleted;
  }

  async createChecklist(name: string) {
    await this.page
      .getByRole("button", { name: "Add checklist", exact: true })
      .click();

    const dialog = this.page.getByRole("dialog");
    const nameInput = dialog.getByPlaceholder("Checklist name");
    await nameInput.fill(name);

    const created = waitForTrpcMutation(this.page, "checklist.create");
    await dialog
      .getByRole("button", { name: "Create checklist", exact: true })
      .click();
    await created;
    await expect(dialog).toHaveCount(0);
  }

  async addChecklistItem(title: string) {
    await this.page
      .getByRole("button", { name: "Add checklist item", exact: true })
      .click();
    const itemInput = this.page.locator('[id^="checklist-item-input-"]');
    await itemInput.click();
    await itemInput.pressSequentially(title);

    const created = waitForTrpcMutation(this.page, "checklist.createItem");
    await this.page.keyboard.press("Enter");
    await created;
  }

  async toggleChecklistItem(title: string) {
    const row = this.page.locator("div.items-start").filter({ hasText: title });
    const updated = waitForTrpcMutation(this.page, "checklist.updateItem");
    await row.getByRole("checkbox").click();
    await updated;
  }

  async deleteChecklist() {
    await this.page
      .getByRole("button", { name: "Delete checklist", exact: true })
      .click();
    const deleted = waitForTrpcMutation(this.page, "checklist.delete");
    await this.page
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await deleted;
  }

  private memberSelectorTrigger() {
    return this.page
      .locator('[aria-label="Members"]')
      .filter({ visible: true });
  }

  async assignMember(memberName: string) {
    await this.memberSelectorTrigger().click();
    const updated = waitForTrpcMutation(this.page, "card.addOrRemoveMember");
    await this.page
      .getByRole("checkbox", { name: memberName })
      .filter({ visible: true })
      .click();
    await updated;
    await this.page.keyboard.press("Escape");
  }

  async setDueDateToday() {
    await this.page
      .getByRole("button", { name: "Set due date", exact: true })
      .filter({ visible: true })
      .click();

    const today = new Date().toISOString().slice(0, 10);
    await this.page
      .locator(`time[datetime="${today}"]`)
      .filter({ visible: true })
      .click();

    const updated = waitForTrpcMutation(this.page, "card.update");
    await this.page.mouse.click(10, 10);
    await updated;
  }
}
