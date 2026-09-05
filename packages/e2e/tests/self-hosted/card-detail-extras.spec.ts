import { expect, test } from "@playwright/test";

import { AuthPage } from "../support/pages/auth-page";
import { BoardPage } from "../support/pages/board-page";
import { CardPage } from "../support/pages/card-page";
import { DashboardPage } from "../support/pages/dashboard-page";
import { SelfHostedOnboardingPage } from "../support/pages/self-hosted-onboarding-page";
import { createTestUser } from "../support/test-user";

test(
  "comments, checklists, member assignment, and due dates can be managed on a card",
  { tag: "@self-hosted" },
  async ({ page }) => {
    const user = createTestUser();
    const auth = new AuthPage(page);
    const onboarding = new SelfHostedOnboardingPage(page);
    const dashboard = new DashboardPage(page);
    const board = new BoardPage(page);
    const card = new CardPage(page);

    await auth.signUp(user);
    await onboarding.createFirstWorkspace("E2E Test Workspace");
    await dashboard.expectSignedInAs(user);

    await board.createBoard("E2E Test Board");
    const boardPublicId = page.url().split("/boards/")[1];
    if (!boardPublicId) throw new Error("Could not resolve boardPublicId");
    await board.createList("To do");
    await board.createCard("Card detail test card");
    await board.openCard("Card detail test card");

    await card.addComment("First comment");
    await expect(page.getByText("First comment")).toBeVisible();

    await card.editComment("Edited comment");
    await expect(page.getByText("Edited comment")).toBeVisible();
    await expect(page.getByText("(edited)")).toBeVisible();

    await card.deleteComment();
    await expect(page.getByText("Edited comment")).toHaveCount(0);

    await card.createChecklist("My checklist");
    await expect(page.getByText("My checklist")).toBeVisible();

    await card.addChecklistItem("Buy milk");
    await expect(page.getByText("Buy milk")).toBeVisible();

    await card.toggleChecklistItem("Buy milk");
    await page.reload();
    await expect(page.getByText("1/1")).toBeVisible();

    await card.assignMember(user.name);
    await card.setDueDateToday();

    const cardPublicId = page.url().split("/cards/")[1];
    if (!cardPublicId) throw new Error("Could not resolve cardPublicId");

    const cardResponse = await page.request.get(
      `/api/trpc/card.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { cardPublicId } } }),
      )}`,
    );
    const cardBody = (await cardResponse.json()) as [
      {
        result: {
          data: {
            json: {
              members: {
                email: string;
                user: { name: string | null } | null;
              }[];
              dueDate: string | null;
            };
          };
        };
      },
    ];
    const cardJson = cardBody[0].result.data.json;
    expect(
      cardJson.members.some(
        (m) => m.user?.name === user.name || m.email === user.email,
      ),
    ).toBe(true);
    expect(cardJson.dueDate).not.toBeNull();

    const boardResponse = await page.request.get(
      `/api/trpc/board.byId?batch=1&input=${encodeURIComponent(
        JSON.stringify({
          "0": { json: { boardPublicId, cardView: "summary" } },
        }),
      )}`,
    );
    expect(boardResponse.ok()).toBe(true);
    const boardBody = (await boardResponse.json()) as [
      {
        result: {
          data: {
            json: {
              lists: {
                cards: {
                  publicId: string;
                  description: string | null;
                  attachments: { publicId: string }[];
                  comments: { publicId: string }[];
                  checklists: { publicId: string }[];
                  summary?: {
                    hasDescription: boolean;
                    attachmentCount: number;
                    hasComments: boolean;
                    checklistItemCount: number;
                    completedChecklistItemCount: number;
                  };
                }[];
              }[];
            };
          };
        };
      },
    ];
    const boardCard = boardBody[0].result.data.json.lists
      .flatMap((list) => list.cards)
      .find((item) => item.publicId === cardPublicId);

    expect(boardCard).toMatchObject({
      description: null,
      attachments: [],
      comments: [],
      checklists: [],
      summary: {
        hasDescription: false,
        attachmentCount: 0,
        hasComments: false,
        checklistItemCount: 1,
        completedChecklistItemCount: 1,
      },
    });

    await card.deleteChecklist();
    await expect(
      page.getByRole("textbox", { name: "My checklist" }),
    ).toHaveCount(0);
  },
);
