import { Readable } from "node:stream";
import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it, vi } from "vitest";

import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import handler from "../pages/api/stripe/webhook";

const event = {
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
};

vi.mock("~/env", () => ({ env: {} }));
vi.mock("@kan/stripe", () => ({
  createStripeClient: () => ({ webhooks: { constructEvent: () => event } }),
}));
vi.mock("@kan/server/context", () => ({
  createNextApiContext: vi.fn().mockResolvedValue({ db: {} }),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn().mockResolvedValue(undefined),
  create: vi.fn(),
}));
vi.mock("@kan/db/repository/subscription.repo", () => ({ create: vi.fn() }));
vi.mock("@kan/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

describe("POST /api/stripe/webhook", () => {
  it("links a new workspace's subscription to its Stripe subscription", async () => {
    const req = Object.assign(Readable.from([]), {
      method: "POST",
      url: "/api/stripe/webhook",
      headers: { "stripe-signature": "sig" },
    });
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await handler(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(vi.mocked(workspaceRepo.create)).toHaveBeenCalled();
    expect(vi.mocked(subscriptionRepo.create)).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        referenceId: "ws1234567890",
        stripeSubscriptionId: "sub_1",
      }),
    );
  });
});
