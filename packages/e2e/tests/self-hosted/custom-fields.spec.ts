import type { Browser, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { MembersPage } from "../support/pages/members-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import {
  waitForTrpcMutation,
  waitForTrpcQuery,
} from "../support/wait-for-trpc";

async function inviteGuest(ownerPage: Page, browser: Browser) {
  const members = new MembersPage(ownerPage);
  await members.open();
  const inviteLink = await members.createInviteLink();

  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const guest = createTestUser();
  await new AuthPage(guestPage).signUp(guest);
  await new SelfHostedOnboardingPage(guestPage).createFirstWorkspace(
    "Guest's Own Workspace",
  );
  await guestPage.goto(inviteLink);
  await guestPage.waitForURL(/\/boards\?workspacePublicId=/, {
    timeout: 20_000,
  });

  await ownerPage.reload();
  await members.open();
  await members.changeRole(guest.email, "guest");

  return { guestContext, guestPage };
}

test(
  "a custom field can be created and populated on a card",
  { tag: "@self-hosted" },
  async ({ page, browser }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("E2E Custom Fields Board");
    await board.createList("To do");
    await board.createList("Done");
    await board.createCard("Custom fields test card", "To do");
    await board.createCard("Unapproved card", "To do");

    await page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Custom fields" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Custom fields" }),
    ).toBeVisible();
    const addField = async (
      name: string,
      type: string,
      showOnCard = true,
      options: string[] = [],
    ) => {
      await dialog.getByPlaceholder("Field name").fill(name);
      await dialog
        .getByRole("combobox", { name: "Field type" })
        .selectOption({ label: type });
      const showOnCardToggle = dialog
        .getByRole("switch", { name: "Show on card front" })
        .last();
      if ((await showOnCardToggle.isChecked()) !== showOnCard)
        await showOnCardToggle.click();
      for (const option of options) {
        await dialog.getByPlaceholder("New option").last().fill(option);
        await dialog
          .getByRole("button", { name: "Add", exact: true })
          .last()
          .click();
      }
      const definitionCreated = waitForTrpcMutation(
        page,
        "customField.createDefinition",
      );
      await dialog.getByRole("button", { name: "Add field" }).click();
      await definitionCreated;
      await expect(
        dialog.getByRole("textbox", { name: "Custom field name" }).last(),
      ).toHaveValue(name);
    };

    await addField("Effort notes", "Text", false);
    await addField("Estimate", "Number");
    await addField("Milestone", "Date");
    await addField("Approved", "Checkbox");
    await addField("Priority", "Dropdown", true, ["High"]);
    await addField("Empty field", "Text");
    await dialog.getByRole("button", { name: "Close" }).click();

    const boardPath = new URL(page.url()).pathname;
    await board.openCard("Custom fields test card");
    const field = page.getByRole("textbox", { name: "Effort notes" });
    await field.fill("  Preserve\nthese spaces  ");
    const valueStored = waitForTrpcMutation(page, "customField.setValue");
    await field.blur();
    await valueStored;

    const estimate = page.getByRole("textbox", { name: "Estimate" });
    await estimate.fill("13.5");
    const estimateStored = waitForTrpcMutation(page, "customField.setValue");
    await estimate.blur();
    await estimateStored;

    const milestone = page.getByRole("textbox", { name: "Milestone" });
    await milestone.fill("2026-09-05T12:30");
    const milestoneStored = waitForTrpcMutation(page, "customField.setValue");
    await milestone.blur();
    await milestoneStored;

    const priorityStored = waitForTrpcMutation(page, "customField.setValue");
    const priority = page.getByRole("button", { name: "Priority" });
    await priority.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await priorityStored;

    const approved = page.getByRole("checkbox", { name: "Approved" });
    const approvedEditor = approved.locator("..");
    await expect(approved).not.toBeChecked();
    await expect(
      approvedEditor.getByText("Not set", { exact: true }),
    ).toBeVisible();

    let checkboxStored = waitForTrpcMutation(page, "customField.setValue");
    await approved.focus();
    await page.keyboard.press("Space");
    await checkboxStored;
    await expect(approved).toBeChecked();
    await expect(
      approvedEditor.getByText("Checked", { exact: true }),
    ).toBeVisible();

    checkboxStored = waitForTrpcMutation(page, "customField.setValue");
    await approved.click();
    await checkboxStored;
    await expect(approved).not.toBeChecked();
    await expect(
      approvedEditor.getByText("Unchecked", { exact: true }),
    ).toBeVisible();

    const checkboxCleared = waitForTrpcMutation(page, "customField.clearValue");
    await approvedEditor.getByRole("button", { name: "Not set" }).click();
    await checkboxCleared;
    await expect(
      approvedEditor.getByText("Not set", { exact: true }),
    ).toBeVisible();

    checkboxStored = waitForTrpcMutation(page, "customField.setValue");
    await approved.click();
    await checkboxStored;

    const cardReloaded = waitForTrpcQuery(page, "card.byId");
    await page.reload();
    await cardReloaded;
    await expect(
      page.getByRole("textbox", { name: "Effort notes" }),
    ).toHaveValue("  Preserve\nthese spaces  ");
    await expect(page.getByRole("textbox", { name: "Estimate" })).toHaveValue(
      "13.5",
    );
    await expect(page.getByRole("textbox", { name: "Milestone" })).toHaveValue(
      "2026-09-05T12:30",
    );
    await expect(page.getByRole("button", { name: "Priority" })).toHaveText(
      "High",
    );

    await field.fill("Discard this edit");
    await field.press("Escape");
    await expect(field).toHaveValue("  Preserve\nthese spaces  ");

    await milestone.fill("2026-09-06T09:45");
    await milestone.press("Escape");
    await expect(milestone).toHaveValue("2026-09-05T12:30");

    await page.route(/\/api\/trpc\/customField\.clearValue/, (route) =>
      route.abort(),
    );
    await field.fill("");
    await field.blur();
    await expect(field).toHaveValue("  Preserve\nthese spaces  ");
    await page.unroute(/\/api\/trpc\/customField\.clearValue/);

    await estimate.fill("not-a-number");
    const invalidNumberRejected = waitForTrpcMutation(
      page,
      "customField.setValue",
    );
    await estimate.blur();
    expect((await invalidNumberRejected).ok()).toBe(false);
    await expect(estimate).toHaveValue("13.5");
    await expect(page.getByText("Unable to update custom field")).toBeVisible();

    const cardPath = new URL(page.url()).pathname;
    await page.goto(boardPath);
    const cardLink = page.locator(`a[href="${cardPath}"]`);
    await expect(cardLink.getByText("Effort notes:")).toHaveCount(0);
    await expect(cardLink.getByText("Preserve these spaces")).toHaveCount(0);
    await expect(cardLink.getByText("Estimate:")).toBeVisible();
    await expect(cardLink.getByText("Milestone:")).toBeVisible();
    await expect(cardLink.getByText("Priority:")).toBeVisible();
    await expect(cardLink.getByText("Approved:")).toBeVisible();

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitem").filter({ hasText: "Approved" }).click();
    const filtered = waitForTrpcQuery(page, "board.byId");
    await page
      .getByRole("checkbox", { name: "Checked", exact: true })
      .filter({ visible: true })
      .click();
    await filtered;
    await expect(page.getByText("Custom fields test card")).toBeVisible();
    await expect(page.getByText("Unapproved card")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await board.duplicateCard("Custom fields test card", "Done");
    await expect(page.getByText("Custom fields test card")).toHaveCount(2);
    await expect(page.getByText("Approved:", { exact: true })).toHaveCount(2);

    await board.makeTemplate();
    await page.goto("/boards");
    await board.createBoardFromTemplate(
      "Custom Fields Template Copy",
      "E2E Custom Fields Board",
    );
    const copiedBoardPath = new URL(page.url()).pathname;
    await expect(
      page.getByText("Custom fields test card", { exact: true }),
    ).toHaveCount(2);

    await page
      .getByText("Custom fields test card", { exact: true })
      .first()
      .click();
    await page.waitForURL(/\/cards\/[^/]+$/);
    await expect(
      page.getByRole("textbox", { name: "Effort notes" }),
    ).toHaveValue("  Preserve\nthese spaces  ");
    await expect(page.getByRole("textbox", { name: "Estimate" })).toHaveValue(
      "13.5",
    );
    await expect(page.getByRole("textbox", { name: "Milestone" })).toHaveValue(
      "2026-09-05T12:30",
    );
    await expect(
      page.getByRole("checkbox", { name: "Approved" }),
    ).toBeChecked();
    await expect(page.getByRole("button", { name: "Priority" })).toHaveText(
      "High",
    );

    const { guestContext, guestPage } = await inviteGuest(page, browser);
    await guestPage.goto(copiedBoardPath);
    await guestPage
      .getByText("Custom fields test card", { exact: true })
      .first()
      .click();
    await guestPage.waitForURL(/\/cards\/[^/]+$/);

    const customFields = guestPage
      .getByRole("heading", { name: "Custom fields" })
      .locator("..");
    await expect(customFields.getByText("Effort notes")).toBeVisible();
    await expect(customFields.getByText("Preserve these spaces")).toBeVisible();
    await expect(customFields.getByText("Estimate")).toBeVisible();
    await expect(customFields.getByText("13.5", { exact: true })).toBeVisible();
    await expect(customFields.getByText("Milestone")).toBeVisible();
    await expect(customFields.getByText("Approved")).toBeVisible();
    await expect(
      customFields.getByText("Checked", { exact: true }),
    ).toBeVisible();
    await expect(customFields.getByText("Priority")).toBeVisible();
    await expect(customFields.getByText("High", { exact: true })).toBeVisible();
    await expect(customFields.getByText("Empty field")).toHaveCount(0);
    await expect(
      guestPage.getByRole("textbox", { name: "Estimate" }),
    ).toHaveCount(0);

    await guestContext.close();
  },
);

test(
  "cards can be filtered by scalar custom fields",
  { tag: "@self-hosted" },
  async ({ page }) => {
    test.setTimeout(60_000);
    const user = createTestUser();
    const board = new BoardPage(page);

    await new AuthPage(page).signUp(user);
    await new SelfHostedOnboardingPage(page).createFirstWorkspace(
      "E2E Scalar Filter Workspace",
    );
    await board.createBoard("E2E Scalar Filters");
    await board.createList("To do");
    await board.createCard("Matching card");
    await board.createCard("Unmatched card");

    await page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Custom fields" }).click();
    const manager = page.getByRole("dialog");
    const fields: [string, string][] = [
      ["Notes", "Text"],
      ["Estimate", "Number"],
      ["Target", "Date"],
    ];
    for (const [name, type] of fields) {
      await manager.getByPlaceholder("Field name").fill(name);
      await manager
        .getByRole("combobox", { name: "Field type" })
        .selectOption({ label: type });
      const created = waitForTrpcMutation(page, "customField.createDefinition");
      await manager.getByRole("button", { name: "Add field" }).click();
      await created;
    }
    await manager.getByRole("button", { name: "Close" }).click();

    await board.openCard("Matching card");
    const setValue = async (name: string, value: string) => {
      const stored = waitForTrpcMutation(page, "customField.setValue");
      const input = page.getByRole("textbox", { name });
      await input.fill(value);
      await input.blur();
      await stored;
    };
    await setValue("Notes", "Release candidate");
    await setValue("Estimate", "13.5");
    await setValue("Target", "2026-09-05T12:30");
    await page.getByRole("link", { name: "Close" }).click();

    const openFilter = async (fieldName: string) => {
      // Board refetches unmount the menu; wait out the preceding URL update.
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: "Filter", exact: true }).click();
      await page.getByRole("menuitem").filter({ hasText: fieldName }).click();
      await page.getByRole("menuitem").filter({ visible: true }).click();
      return page.getByRole("dialog");
    };
    const clearFilters = async () => {
      const cleared = waitForTrpcQuery(page, "board.byId");
      await page.getByRole("button", { name: "Clear filters" }).click();
      await cleared;
      await expect(page.getByText("Unmatched card")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Clear filters" }),
      ).toHaveCount(0);
    };

    let filter = await openFilter("Notes");
    await filter.getByRole("textbox", { name: "Value" }).fill("candidate");
    let filtered = waitForTrpcQuery(page, "board.byId");
    await filter.getByRole("button", { name: "Apply" }).click();
    await filtered;
    await expect(page.getByText("Matching card")).toBeVisible();
    await expect(page.getByText("Unmatched card")).toHaveCount(0);

    filter = await openFilter("Notes");
    await expect(filter.getByRole("textbox", { name: "Value" })).toHaveValue(
      "candidate",
    );
    filtered = waitForTrpcQuery(page, "board.byId");
    await filter.getByRole("button", { name: "Clear" }).click();
    await filtered;
    await expect(page.getByText("Unmatched card")).toBeVisible();

    filter = await openFilter("Estimate");
    await filter
      .getByRole("combobox", { name: "Operator" })
      .selectOption({ label: "Range" });
    await filter.getByRole("textbox", { name: "From" }).fill("13");
    await filter.getByRole("textbox", { name: "To" }).fill("14");
    filtered = waitForTrpcQuery(page, "board.byId");
    await filter.getByRole("button", { name: "Apply" }).click();
    await filtered;
    await expect(page.getByText("Unmatched card")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Clear filters" }),
    ).toHaveText("1");

    filter = await openFilter("Target");
    await filter
      .getByRole("combobox", { name: "Operator" })
      .selectOption({ label: "Range" });
    await filter.getByLabel("From", { exact: true }).fill("2026-09-05");
    await filter.getByLabel("To", { exact: true }).fill("2026-09-05");
    filtered = waitForTrpcQuery(page, "board.byId");
    await filter.getByRole("button", { name: "Apply" }).click();
    await filtered;
    await expect(page.getByText("Matching card")).toBeVisible();
    await expect(page.getByText("Unmatched card")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Clear filters" }),
    ).toHaveText("2");
    await clearFilters();
  },
);

test(
  "custom fields and options can be reordered and archived safely",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Lifecycle Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("E2E Custom Fields Lifecycle");
    await board.createList("To do");
    await board.createCard("Lifecycle card", "To do");

    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.setViewportSize({ width: 390, height: 844 });

    const openManager = async () => {
      await page
        .getByRole("button", { name: "Board options", exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Custom fields" }).click();
      return page.getByRole("dialog");
    };
    const dialog = await openManager();
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox?.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox ? dialogBox.x + dialogBox.width : 0).toBeLessThanOrEqual(
      390,
    );
    const addField = async (name: string, type: string) => {
      await dialog.getByPlaceholder("Field name").fill(name);
      await dialog
        .getByRole("combobox", { name: "Field type" })
        .selectOption({ label: type });
      const definitionCreated = waitForTrpcMutation(
        page,
        "customField.createDefinition",
      );
      await dialog.getByRole("button", { name: "Add field" }).click();
      await definitionCreated;
    };

    await addField("Notes", "Text");
    await addField("Priority", "Dropdown");

    let priorityField = dialog.locator("section").nth(1);
    for (const optionName of ["Low", "High"]) {
      await priorityField.getByPlaceholder("New option").fill(optionName);
      const optionCreated = waitForTrpcMutation(
        page,
        "customField.createOption",
      );
      await priorityField.getByRole("button", { name: "Add" }).click();
      await optionCreated;
    }

    const fieldsReordered = waitForTrpcMutation(
      page,
      "customField.reorderDefinitions",
    );
    await priorityField.getByRole("button", { name: "Move field up" }).click();
    await fieldsReordered;
    await expect(
      dialog
        .locator("section")
        .first()
        .getByRole("textbox", { name: "Custom field name" }),
    ).toHaveValue("Priority");

    priorityField = dialog.locator("section").first();
    const optionsReordered = waitForTrpcMutation(
      page,
      "customField.reorderOptions",
    );
    await priorityField
      .getByRole("button", { name: "Move option up" })
      .nth(1)
      .click();
    await optionsReordered;
    await expect(
      priorityField.getByRole("textbox", { name: "Option name" }).first(),
    ).toHaveValue("High");

    await dialog.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    const notesFilterGroup = page
      .getByRole("menuitem")
      .filter({ hasText: "Notes" });
    await notesFilterGroup.focus();
    await page.keyboard.press("Enter");
    const setFilter = page.getByRole("menuitem").filter({ visible: true });
    await setFilter.focus();
    await page.keyboard.press("Enter");
    const filterDialog = page.getByRole("dialog");
    const filterDialogBox = await filterDialog.boundingBox();
    expect(filterDialogBox).not.toBeNull();
    expect(filterDialogBox?.x).toBeGreaterThanOrEqual(0);
    expect(
      filterDialogBox ? filterDialogBox.x + filterDialogBox.width : 0,
    ).toBeLessThanOrEqual(390);
    await page.keyboard.press("Escape");
    await expect(filterDialog).toHaveCount(0);

    const boardPath = new URL(page.url()).pathname;
    await board.openCard("Lifecycle card");
    await page.getByRole("button", { name: "Settings" }).click();
    const valueStored = waitForTrpcMutation(page, "customField.setValue");
    await page.getByRole("button", { name: "Priority" }).click();
    await page.getByRole("option", { name: "Low" }).click();
    await valueStored;

    await page.goto(boardPath);
    const reopenedDialog = await openManager();
    priorityField = reopenedDialog.locator("section").first();
    await priorityField
      .getByRole("button", { name: "Archive option" })
      .nth(1)
      .click();
    await expect(
      priorityField.getByText(
        "Archive this option? Existing card values will keep it until changed.",
      ),
    ).toBeVisible();
    const optionArchived = waitForTrpcMutation(
      page,
      "customField.archiveOption",
    );
    await priorityField
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    await optionArchived;
    await expect(
      priorityField.getByRole("textbox", { name: "Option name" }),
    ).toHaveCount(1);
    await expect(
      priorityField.getByRole("textbox", { name: "Option name" }),
    ).toHaveValue("High");
    await expect(
      priorityField.getByText("Archived options: Low"),
    ).toBeVisible();

    const notesField = reopenedDialog.locator("section").nth(1);
    await notesField
      .getByRole("button", { name: "Archive custom field" })
      .click();
    const fieldArchived = waitForTrpcMutation(
      page,
      "customField.archiveDefinition",
    );
    await notesField
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    await fieldArchived;
    await expect(reopenedDialog.locator("section")).toHaveCount(1);
    await expect(
      reopenedDialog.getByRole("textbox", { name: "Custom field name" }),
    ).toHaveValue("Priority");
    await reopenedDialog.getByRole("button", { name: "Close" }).click();

    await board.openCard("Lifecycle card");
    await page.getByRole("button", { name: "Settings" }).click();
    const priority = page.getByRole("button", { name: "Priority" });
    await expect(priority).toHaveText("Low (Archived)");
    const valueCleared = waitForTrpcMutation(page, "customField.clearValue");
    await priority.click();
    await page.getByRole("option", { name: "Not set" }).click();
    const clearResponse = await valueCleared;
    expect(
      clearResponse.ok(),
      `${clearResponse.request().postData()}\n${await clearResponse.text()}`,
    ).toBeTruthy();
    await priority.click();
    await expect(page.getByRole("option", { name: /Low/ })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Notes" })).toHaveCount(0);
  },
);
