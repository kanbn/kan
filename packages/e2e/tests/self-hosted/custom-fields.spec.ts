import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";
import {
  waitForTrpcMutation,
  waitForTrpcQuery,
} from "../support/wait-for-trpc";

test(
  "a custom field can be created and populated on a card",
  { tag: "@self-hosted" },
  async ({ page }) => {
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
      await expect(
        dialog.getByRole("textbox", { name: "Custom field name" }).last(),
      ).toHaveValue(name);
    };

    await addField("Effort notes", "Text");
    await addField("Estimate", "Number");
    await addField("Milestone", "Date");
    await addField("Approved", "Checkbox");
    await addField("Priority", "Dropdown");

    const priorityField = dialog.locator("section").last();
    await priorityField.getByPlaceholder("New option").fill("High");
    const optionCreated = waitForTrpcMutation(page, "customField.createOption");
    await priorityField.getByRole("button", { name: "Add" }).click();
    await optionCreated;
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

    const milestoneStored = waitForTrpcMutation(page, "customField.setValue");
    await page
      .getByRole("textbox", { name: "Milestone" })
      .fill("2026-09-05T12:30");
    await milestoneStored;

    const priorityStored = waitForTrpcMutation(page, "customField.setValue");
    await page.getByRole("button", { name: "Priority" }).click();
    await page.getByRole("option", { name: "High" }).click();
    await priorityStored;

    const checkboxStored = waitForTrpcMutation(page, "customField.setValue");
    await page.getByRole("button", { name: "Approved" }).click();
    await page.getByRole("option", { name: "Checked", exact: true }).click();
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

    const cardPath = new URL(page.url()).pathname;
    await page.goto(boardPath);
    const cardLink = page.locator(`a[href="${cardPath}"]`);
    await expect(cardLink.getByText("Effort notes:")).toBeVisible();
    await expect(cardLink.getByText("Preserve these spaces")).toBeVisible();
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

    const openManager = async () => {
      await page
        .getByRole("button", { name: "Board options", exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Custom fields" }).click();
      return page.getByRole("dialog");
    };
    const dialog = await openManager();
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
    const boardPath = new URL(page.url()).pathname;
    await board.openCard("Lifecycle card");
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
