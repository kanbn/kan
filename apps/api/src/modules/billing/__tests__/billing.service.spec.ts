import { beforeEach, describe, expect, it, vi } from "vitest";

import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as permissions from "@kan/server/utils/permissions";

import { BillingService } from "../billing.service.js";

const stripe = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
}));
vi.mock("@kan/stripe", () => ({
  createStripeClient: () => stripe,
  subscriptionBillingMode: { type: "classic" },
}));

const user = { id: "user_1", email: "user@example.com" } as never;
let service: BillingService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(userRepo, "getById").mockResolvedValue({
    stripeCustomerId: "cus_1",
  } as never);
  stripe.checkout.sessions.create.mockResolvedValue({ url: "https://co" });
  service = new BillingService();
});

describe("BillingService.handleWebhook", () => {
  it("links a new workspace's subscription to its Stripe subscription", async () => {
    stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: {
            workspacePublicId: "ws1234567890",
            isNewWorkspace: "true",
            workspaceName: "Acme",
            userId: "user_1",
            userEmail: "user@example.com",
            plan: "team",
          },
        },
      },
    });
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(undefined);
    const createWorkspace = vi
      .spyOn(workspaceRepo, "create")
      .mockResolvedValue(undefined as never);
    const createSub = vi
      .spyOn(subscriptionRepo, "create")
      .mockResolvedValue(undefined);

    await service.handleWebhook(Buffer.from("{}"), "sig");

    expect(createWorkspace).toHaveBeenCalled();
    expect(createSub).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        referenceId: "ws1234567890",
        stripeSubscriptionId: "sub_1",
      }),
    );
  });

  it("rejects a bad signature", async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });

    await expect(
      service.handleWebhook(Buffer.from("{}"), "sig"),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("BillingService.createCheckoutSession", () => {
  const input = {
    successUrl: "/boards",
    cancelUrl: "/onboarding",
    plan: "team",
    billing: "annual",
  };

  it("refuses to upgrade a workspace the user can't manage", async () => {
    vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue({
      id: 1,
    } as never);
    vi.spyOn(permissions, "assertPermission").mockRejectedValue(
      new Error("no"),
    );

    await expect(
      service.createCheckoutSession(user, {
        ...input,
        workspacePublicId: "ws1234567890",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("starts checkout for a new workspace", async () => {
    const result = await service.createCheckoutSession(user, {
      ...input,
      workspaceName: "Acme",
    });

    expect(result).toEqual({ url: "https://co" });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        metadata: expect.objectContaining({ isNewWorkspace: "true" }),
      }),
    );
  });
});
