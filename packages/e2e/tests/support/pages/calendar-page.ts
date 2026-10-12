import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForTrpcMutation } from "../wait-for-trpc";

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export class CalendarPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page
      .getByRole("button", { name: "Calendar", exact: true })
      .click();
    await this.page.waitForURL(/[?&]view=calendar/);
    await this.page
      .getByRole("button", { name: "Today", exact: true })
      .waitFor();
  }

  async openLists() {
    await this.page.getByRole("button", { name: "Lists", exact: true }).click();
    await this.page.waitForURL((url) => !url.search.includes("view=calendar"));
  }

  async goToNextMonth() {
    await this.page
      .getByRole("button", { name: "Next month", exact: true })
      .click();
  }

  async goToPreviousMonth() {
    await this.page
      .getByRole("button", { name: "Previous month", exact: true })
      .click();
  }

  async goToToday() {
    await this.page.getByRole("button", { name: "Today", exact: true }).click();
  }

  async monthLabel() {
    return this.page.locator("header h2 time").innerText();
  }

  private dayCell(date: Date) {
    return this.page
      .locator(`time[datetime="${toDateKey(date)}"]`)
      .filter({ visible: true })
      .locator("..");
  }

  async expectCardOnDate(cardTitle: string, date: Date) {
    await expect(
      this.dayCell(date).getByText(cardTitle, { exact: true }),
    ).toBeVisible();
  }

  async expectNoCardOnDate(cardTitle: string, date: Date) {
    await expect(
      this.dayCell(date).getByText(cardTitle, { exact: true }),
    ).toHaveCount(0);
  }

  async createCardOnDate(date: Date, title: string) {
    await this.dayCell(date).click();
    await this.page.getByRole("heading", { name: "New card" }).waitFor();
    await this.page.getByPlaceholder("Card title").fill(title);
    const created = waitForTrpcMutation(this.page, "card.create");
    await this.page.getByRole("button", { name: "Create card" }).click();
    await this.page
      .getByRole("heading", { name: "New card" })
      .waitFor({ state: "hidden" });
    await created;
  }

  async expectUnlocked() {
    await expect(
      this.page.getByRole("heading", {
        name: "Never lose track of what's due",
      }),
    ).toHaveCount(0);
  }

  async expectLocked() {
    await expect(
      this.page.getByRole("heading", {
        name: "Never lose track of what's due",
      }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Upgrade", exact: true }),
    ).toBeVisible();
  }
}
