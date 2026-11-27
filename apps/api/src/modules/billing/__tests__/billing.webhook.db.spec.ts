import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { pgliteExtensions } from "@kan/db/client";
import * as permissionRepo from "@kan/db/repository/permission.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as schema from "@kan/db/schema";

import { BillingService } from "../billing.service.js";

// Real Postgres (in-memory PGLite, migrated from packages/db/migrations) so
// these tests see what actually got committed, not what a mock was called with.
const testDb = vi.hoisted((): { current: unknown } => ({ current: undefined }));
vi.mock("../../../common/session.util.js", () => ({
  get db() {
    return testDb.current;
  },
}));

const stripe = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
}));
vi.mock("@kan/stripe", () => ({
  createStripeClient: () => stripe,
  subscriptionBillingMode: { type: "classic" },
}));

type Db = ReturnType<typeof drizzle<typeof schema>>;
let db: Db;
const USER_ID = "00000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  process.env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID = "price_team";
  const client = new PGlite({ extensions: pgliteExtensions });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "../../packages/db/migrations" });
  await db.insert(schema.users).values({
    id: USER_ID,
    email: "owner@example.com",
    emailVerified: true,
  });
  testDb.current = db;
}, 60_000);

let n = 0;
let wsPublicId: string;
let service: BillingService;

beforeEach(() => {
  vi.restoreAllMocks();
  n += 1;
  wsPublicId = `ws${String(n).padStart(10, "0")}`;
  stripe.webhooks.constructEvent.mockReturnValue({
    id: `evt_${n}`,
    type: "checkout.session.completed",
    data: {
      object: {
        mode: "subscription",
        customer: "cus_1",
        subscription: `sub_${n}`,
        metadata: {
          workspacePublicId: wsPublicId,
          isNewWorkspace: "true",
          workspaceName: "Acme",
          workspaceSlug: `acme-${n}`,
          userId: USER_ID,
          userEmail: "owner@example.com",
          plan: "team",
        },
      },
    },
  });
  stripe.subscriptions.retrieve.mockImplementation((id: string) =>
    Promise.resolve({
      id,
      status: "trialing",
      customer: "cus_1",
      metadata: {},
      cancel_at_period_end: false,
      items: {
        data: [
          {
            price: { id: "price_team", recurring: { interval: "month" } },
            quantity: 1,
          },
        ],
      },
    }),
  );
  service = new BillingService();
});

const deliver = () => service.handleWebhook(Buffer.from("{}"), "sig");

const committed = async () => {
  const ws = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.publicId, wsPublicId),
  });
  const subs = await db.query.subscription.findMany({
    where: eq(schema.subscription.referenceId, wsPublicId),
  });
  const members = ws
    ? await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, ws.id),
      })
    : [];
  const roles = ws
    ? await db.query.workspaceRoles.findMany({
        where: eq(schema.workspaceRoles.workspaceId, ws.id),
      })
    : [];
  return { ws, subs, members, roles };
};

describe("checkout.session.completed for a new workspace (real database)", () => {
  it("creates the workspace, its owner and one linked subscription", async () => {
    await deliver();

    const { ws, subs, members } = await committed();
    expect(ws?.plan).toBe("team");
    expect(members).toHaveLength(1);
    expect(subs).toHaveLength(1);
    expect(subs[0]?.stripeSubscriptionId).toBe(`sub_${n}`);
  });

  it("is a no-op when Stripe delivers the same event twice", async () => {
    await deliver();
    await deliver();

    const { subs, members } = await committed();
    expect(members).toHaveLength(1);
    expect(subs).toHaveLength(1);
  });

  it("completes the subscription when Stripe retries after the insert failed", async () => {
    vi.spyOn(subscriptionRepo, "create").mockRejectedValueOnce(
      new Error("connection reset"),
    );
    await expect(deliver()).rejects.toThrow();

    await deliver(); // Stripe's retry

    const { subs } = await committed();
    expect(subs).toHaveLength(1);
  });

  it("commits nothing when workspace setup fails part-way (#697)", async () => {
    // The workspace row is written, then creating its roles fails.
    vi.spyOn(permissionRepo, "createRole").mockRejectedValueOnce(
      new Error("connection reset"),
    );

    await expect(deliver()).rejects.toThrow("connection reset");

    const { ws, subs } = await committed();
    expect(ws).toBeUndefined();
    expect(subs).toHaveLength(0);
  });

  it("leaves the buyer an admin of their workspace after a retry (#697)", async () => {
    vi.spyOn(permissionRepo, "createRole").mockRejectedValueOnce(
      new Error("connection reset"),
    );
    await expect(deliver()).rejects.toThrow();

    await deliver(); // Stripe's retry

    const { ws, subs, members, roles } = await committed();
    expect(ws).toBeDefined();
    expect(roles.length).toBeGreaterThan(0);
    expect(members).toHaveLength(1);
    expect(members[0]?.userId).toBe(USER_ID);
    expect(subs).toHaveLength(1);
  });
});
