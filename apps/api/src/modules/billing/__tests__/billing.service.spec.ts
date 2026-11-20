import { beforeEach, describe, expect, it, vi } from "vitest";

import * as memberRepo from "@kan/db/repository/member.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as permissions from "@kan/server/utils/permissions";

import { BillingService } from "../billing.service.js";

const stripe = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  billingPortal: { sessions: { create: vi.fn() } },
  customers: { create: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
}));
vi.mock("@kan/stripe", () => ({
  createStripeClient: () => stripe,
  subscriptionBillingMode: { type: "classic" },
}));

const cancelWorkspaceAccess = vi.hoisted(() => vi.fn());
vi.mock("@kan/server/utils/workspace", () => ({ cancelWorkspaceAccess }));

const user = { id: "user_1", email: "user@example.com", name: "U" } as never;

const stripeSub = (overrides: Record<string, unknown> = {}) => ({
  id: "sub_1",
  customer: "cus_1",
  status: "trialing",
  metadata: {},
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  ended_at: null,
  trial_start: 1_700_000_000,
  trial_end: 1_701_000_000,
  schedule: null,
  items: {
    data: [
      {
        price: { id: "price_team_monthly", recurring: { interval: "month" } },
        quantity: 1,
        current_period_start: 1_700_000_000,
        current_period_end: 1_702_000_000,
      },
    ],
  },
  ...overrides,
});

const checkoutSession = (metadata: Record<string, string>) => ({
  mode: "subscription",
  subscription: "sub_1",
  customer: "cus_1",
  metadata,
});

let service: BillingService;

const deliver = (type: string, object: unknown) => {
  stripe.webhooks.constructEvent.mockReturnValue({
    id: "evt_1",
    type,
    data: { object },
  });
  return service.handleWebhook(Buffer.from("{}"), "sig");
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID", "price_team_monthly");
  vi.stubEnv("STRIPE_PRO_PLAN_MONTHLY_PRICE_ID", "price_pro_monthly");
  vi.spyOn(userRepo, "getById").mockResolvedValue({
    stripeCustomerId: "cus_1",
  } as never);
  vi.spyOn(workspaceRepo, "update").mockResolvedValue(undefined);
  vi.spyOn(workspaceRepo, "create").mockResolvedValue(undefined as never);
  vi.spyOn(workspaceRepo, "getByPublicId").mockResolvedValue(undefined);
  vi.spyOn(subscriptionRepo, "getByStripeSubscriptionId").mockResolvedValue(
    undefined,
  );
  vi.spyOn(subscriptionRepo, "getById").mockResolvedValue(undefined);
  vi.spyOn(subscriptionRepo, "create").mockResolvedValue({ id: 7 } as never);
  vi.spyOn(subscriptionRepo, "updateById").mockResolvedValue(undefined);
  stripe.subscriptions.retrieve.mockResolvedValue(stripeSub());
  stripe.checkout.sessions.create.mockResolvedValue({ url: "https://co" });
  service = new BillingService();
});

describe("webhook signature", () => {
  it("rejects a bad signature", async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });

    await expect(
      service.handleWebhook(Buffer.from("{}"), "sig"),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("checkout.session.completed", () => {
  const newWorkspace = {
    workspacePublicId: "ws1234567890",
    isNewWorkspace: "true",
    workspaceName: "Acme",
    userId: "user_1",
    userEmail: "user@example.com",
    plan: "team",
  };

  it("creates a new workspace and its subscription row from Stripe's copy", async () => {
    await deliver("checkout.session.completed", checkoutSession(newWorkspace));

    expect(workspaceRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ publicId: "ws1234567890", plan: "team" }),
    );
    expect(subscriptionRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        referenceId: "ws1234567890",
        stripeSubscriptionId: "sub_1",
        stripeCustomerId: "cus_1",
        status: "trialing",
        plan: "team",
        seats: 1,
        billingInterval: "month",
        periodEnd: new Date(1_702_000_000 * 1000),
      }),
    );
  });

  it("does not duplicate anything when Stripe redelivers the event", async () => {
    vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({
      id: 1,
    } as never);
    vi.mocked(subscriptionRepo.getByStripeSubscriptionId).mockResolvedValue({
      id: 7,
    } as never);

    await deliver("checkout.session.completed", checkoutSession(newWorkspace));

    expect(workspaceRepo.create).not.toHaveBeenCalled();
    expect(subscriptionRepo.create).not.toHaveBeenCalled();
    expect(subscriptionRepo.updateById).toHaveBeenCalledWith(
      expect.anything(),
      7,
      expect.objectContaining({ stripeSubscriptionId: "sub_1" }),
    );
  });

  it("activates the pending row for an existing workspace upgrade", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(
      stripeSub({ metadata: { subscriptionId: "7" } }),
    );
    vi.mocked(subscriptionRepo.getById).mockResolvedValue({ id: 7 } as never);

    await deliver(
      "checkout.session.completed",
      checkoutSession({
        workspacePublicId: "ws1234567890",
        isNewWorkspace: "false",
        subscriptionId: "7",
        plan: "team",
      }),
    );

    expect(workspaceRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      "ws1234567890",
      { plan: "team" },
    );
    expect(subscriptionRepo.updateById).toHaveBeenCalledWith(
      expect.anything(),
      7,
      expect.objectContaining({
        stripeSubscriptionId: "sub_1",
        status: "trialing",
        referenceId: "ws1234567890",
      }),
    );
    expect(subscriptionRepo.create).not.toHaveBeenCalled();
  });

  it("gives a Pro subscription unlimited seats and unpauses members", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue(
      stripeSub({
        items: {
          data: [
            {
              price: {
                id: "price_pro_monthly",
                recurring: { interval: "month" },
              },
              quantity: 1,
              current_period_start: 1,
              current_period_end: 2,
            },
          ],
        },
      }),
    );
    vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({
      id: 3,
    } as never);
    const unpause = vi
      .spyOn(memberRepo, "unpauseAllMembers")
      .mockResolvedValue(undefined);

    await deliver(
      "checkout.session.completed",
      checkoutSession({
        workspacePublicId: "ws1234567890",
        isNewWorkspace: "false",
        plan: "pro",
      }),
    );

    expect(subscriptionRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ plan: "pro", unlimitedSeats: true }),
    );
    expect(unpause).toHaveBeenCalledWith(expect.anything(), 3);
  });
});

describe("customer.subscription.created / updated", () => {
  it("links the pending row named in the subscription metadata", async () => {
    vi.mocked(subscriptionRepo.getById).mockResolvedValue({
      id: 7,
      referenceId: "ws1234567890",
    } as never);

    await deliver(
      "customer.subscription.created",
      stripeSub({ metadata: { subscriptionId: "7" } }),
    );

    expect(subscriptionRepo.updateById).toHaveBeenCalledWith(
      expect.anything(),
      7,
      expect.objectContaining({ stripeSubscriptionId: "sub_1" }),
    );
    expect(workspaceRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      "ws1234567890",
      { plan: "team" },
    );
  });

  it("never inserts a row for a subscription it doesn't know", async () => {
    await deliver("customer.subscription.created", stripeSub());

    expect(subscriptionRepo.create).not.toHaveBeenCalled();
    expect(subscriptionRepo.updateById).not.toHaveBeenCalled();
  });

  it("syncs a scheduled cancellation without downgrading yet", async () => {
    vi.mocked(subscriptionRepo.getByStripeSubscriptionId).mockResolvedValue({
      id: 7,
      referenceId: "ws1234567890",
    } as never);

    await deliver(
      "customer.subscription.updated",
      stripeSub({
        status: "active",
        cancel_at_period_end: true,
        cancel_at: 1_702_000_000,
      }),
    );

    expect(subscriptionRepo.updateById).toHaveBeenCalledWith(
      expect.anything(),
      7,
      expect.objectContaining({
        status: "active",
        cancelAtPeriodEnd: true,
        cancelAt: new Date(1_702_000_000 * 1000),
      }),
    );
    expect(cancelWorkspaceAccess).not.toHaveBeenCalled();
  });

  it("does not change the workspace plan while a payment is past due", async () => {
    vi.mocked(subscriptionRepo.getByStripeSubscriptionId).mockResolvedValue({
      id: 7,
      referenceId: "ws1234567890",
    } as never);

    await deliver(
      "customer.subscription.updated",
      stripeSub({ status: "past_due" }),
    );

    expect(subscriptionRepo.updateById).toHaveBeenCalled();
    expect(workspaceRepo.update).not.toHaveBeenCalled();
  });
});

describe("customer.subscription.deleted", () => {
  it("marks the row canceled and downgrades the workspace", async () => {
    vi.mocked(subscriptionRepo.getByStripeSubscriptionId).mockResolvedValue({
      id: 7,
      referenceId: "ws1234567890",
    } as never);

    await deliver(
      "customer.subscription.deleted",
      stripeSub({ status: "canceled", ended_at: 1_702_000_000 }),
    );

    expect(subscriptionRepo.updateById).toHaveBeenCalledWith(
      expect.anything(),
      7,
      expect.objectContaining({ status: "canceled", stripeScheduleId: null }),
    );
    expect(cancelWorkspaceAccess).toHaveBeenCalledWith(
      expect.anything(),
      "ws1234567890",
    );
  });

  it("ignores an unknown subscription", async () => {
    await deliver("customer.subscription.deleted", stripeSub());

    expect(cancelWorkspaceAccess).not.toHaveBeenCalled();
  });
});

describe("createCheckoutSession", () => {
  const input = {
    successUrl: "/boards",
    cancelUrl: "/onboarding",
    plan: "team",
    billing: "monthly",
  };

  it("refuses to upgrade a workspace the user can't manage", async () => {
    vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({
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
    expect(subscriptionRepo.create).not.toHaveBeenCalled();
  });

  it("creates and saves a Stripe customer the first time a user checks out", async () => {
    vi.mocked(userRepo.getById).mockResolvedValue({
      stripeCustomerId: null,
    } as never);
    stripe.customers.create.mockResolvedValue({ id: "cus_new" });
    const update = vi.spyOn(userRepo, "update").mockResolvedValue(undefined);

    await service.createCheckoutSession(user, {
      ...input,
      workspaceName: "Acme",
    });

    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com" }),
      { idempotencyKey: "customer-user_1" },
    );
    expect(update).toHaveBeenCalledWith(expect.anything(), "user_1", {
      stripeCustomerId: "cus_new",
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" }),
    );
  });

  it("links an existing workspace upgrade to a pending row", async () => {
    vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({
      id: 1,
    } as never);
    vi.spyOn(permissions, "assertPermission").mockResolvedValue(undefined);

    await service.createCheckoutSession(user, {
      ...input,
      workspacePublicId: "ws1234567890",
    });

    expect(subscriptionRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        referenceId: "ws1234567890",
        status: "incomplete",
        stripeCustomerId: "cus_1",
      }),
    );
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_1",
        subscription_data: expect.objectContaining({
          metadata: { subscriptionId: "7" },
        }),
      }),
    );
  });
});

describe("createPortalSession", () => {
  it("returns 404 when the user has no billing account", async () => {
    vi.mocked(userRepo.getById).mockResolvedValue({
      stripeCustomerId: null,
    } as never);

    await expect(service.createPortalSession("user_1")).rejects.toMatchObject({
      status: 404,
    });
  });
});
