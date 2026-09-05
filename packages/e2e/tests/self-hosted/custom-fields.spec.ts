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
    await page
      .getByRole("combobox", { name: "Priority" })
      .selectOption({ label: "High" });
    await priorityStored;

    const checkboxStored = waitForTrpcMutation(page, "customField.setValue");
    await page.getByRole("combobox", { name: "Approved" }).selectOption("true");
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
    await expect(
      page
        .getByRole("combobox", { name: "Priority" })
        .locator("option:checked"),
    ).toHaveText("High");

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
