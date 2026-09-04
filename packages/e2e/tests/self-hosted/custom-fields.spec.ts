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
    await board.createCard("Custom fields test card");
    await board.createCard("Unapproved card");

    await page
      .getByRole("button", { name: "Board options", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Custom fields" }).click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Custom fields" }),
    ).toBeVisible();
    await dialog.getByPlaceholder("Field name").fill("Effort notes");
    await dialog.getByRole("combobox", { name: "Field type" }).selectOption({
      label: "Text",
    });

    const definitionCreated = waitForTrpcMutation(
      page,
      "customField.createDefinition",
    );
    await dialog.getByRole("button", { name: "Add field" }).click();
    await definitionCreated;
    await expect(
      dialog.getByRole("textbox", { name: "Custom field name" }),
    ).toHaveValue("Effort notes");

    await dialog.getByPlaceholder("Field name").fill("Approved");
    await dialog.getByRole("combobox", { name: "Field type" }).selectOption({
      label: "Checkbox",
    });
    const checkboxCreated = waitForTrpcMutation(
      page,
      "customField.createDefinition",
    );
    await dialog.getByRole("button", { name: "Add field" }).click();
    await checkboxCreated;
    await dialog.getByRole("button", { name: "Close" }).click();

    await board.openCard("Custom fields test card");
    const field = page.getByRole("textbox", { name: "Effort notes" });
    await field.fill("  Preserve these spaces  ");
    const valueStored = waitForTrpcMutation(page, "customField.setValue");
    await field.blur();
    await valueStored;
    const checkboxStored = waitForTrpcMutation(page, "customField.setValue");
    await page.getByRole("combobox", { name: "Approved" }).selectOption("true");
    await checkboxStored;

    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "Effort notes" }),
    ).toHaveValue("  Preserve these spaces  ");

    const cardPath = new URL(page.url()).pathname;
    await page.goBack();
    const cardLink = page.locator(`a[href="${cardPath}"]`);
    await expect(cardLink.getByText("Effort notes:")).toBeVisible();
    await expect(cardLink.getByText("Preserve these spaces")).toBeVisible();
    await expect(cardLink.getByText("Approved:")).toBeVisible();

    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByText("Approved", { exact: true }).click();
    const filtered = waitForTrpcQuery(page, "board.byId");
    await page
      .getByRole("checkbox", { name: "Checked" })
      .filter({ visible: true })
      .click();
    await filtered;
    await expect(page.getByText("Custom fields test card")).toBeVisible();
    await expect(page.getByText("Unapproved card")).toHaveCount(0);
  },
);
