import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import type { Stripe } from "@kan/stripe";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { assertPermission } from "@kan/server/utils/permissions";
import { cancelWorkspaceAccess } from "@kan/server/utils/workspace";
import { generateUID } from "@kan/shared/utils";
import { createStripeClient, subscriptionBillingMode } from "@kan/stripe";

import type { User } from "../../common/interfaces/user.interface.js";
import type { CreateCheckoutSessionDto } from "./dto/billing.dto.js";
import { db } from "../../common/session.util.js";

const log = createLogger("billing");

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? "";

const planForPrice = (priceId: string | undefined) => {
  if (!priceId) return undefined;
  const env = process.env;
  if (
    [
      env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID,
      env.STRIPE_TEAM_PLAN_YEARLY_PRICE_ID,
    ].includes(priceId)
  )
    return "team" as const;
  if (
    [
      env.STRIPE_PRO_PLAN_MONTHLY_PRICE_ID,
      env.STRIPE_PRO_PLAN_YEARLY_PRICE_ID,
    ].includes(priceId)
  )
    return "pro" as const;
  return undefined;
};

const toDate = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000) : null;

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : value?.id;

const syncedFields = (sub: Stripe.Subscription) => {
  const item = sub.items.data[0];
  const plan = planForPrice(item?.price.id);
  return {
    ...(plan && { plan, unlimitedSeats: plan === "pro" }),
    status: sub.status,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: idOf(sub.customer),
    periodStart: toDate(item?.current_period_start),
    periodEnd: toDate(item?.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    cancelAt: toDate(sub.cancel_at),
    canceledAt: toDate(sub.canceled_at),
    endedAt: toDate(sub.ended_at),
    trialStart: toDate(sub.trial_start),
    trialEnd: toDate(sub.trial_end),
    seats: item?.quantity ?? null,
    billingInterval: item?.price.recurring?.interval ?? null,
    stripeScheduleId: idOf(sub.schedule) ?? null,
  };
};

const findRow = async (sub: Stripe.Subscription) => {
  const byStripeId = await subscriptionRepo.getByStripeSubscriptionId(
    db,
    sub.id,
  );
  if (byStripeId) return byStripeId;
  const rowId = Number(sub.metadata.subscriptionId);
  return Number.isInteger(rowId) && rowId > 0
    ? subscriptionRepo.getById(db, rowId)
    : undefined;
};

@Injectable()
export class BillingService {
  private async ensureCustomer(user: User) {
    const existing = (await userRepo.getById(db, user.id))?.stripeCustomerId;
    if (existing) return existing;

    const customer = await createStripeClient().customers.create(
      { email: user.email, name: user.name, metadata: { userId: user.id } },
      { idempotencyKey: `customer-${user.id}` },
    );
    await userRepo.update(db, user.id, { stripeCustomerId: customer.id });
    return customer.id;
  }

  async createCheckoutSession(user: User, input: CreateCheckoutSessionDto) {
    if (input.plan !== "team")
      throw new BadRequestException(
        "The Pro plan is no longer available. Please choose Team.",
      );

    const workspacePublicId = input.workspacePublicId ?? generateUID();

    if (input.workspacePublicId) {
      const workspace = await workspaceRepo.getByPublicId(
        db,
        input.workspacePublicId,
      );
      if (!workspace) throw new NotFoundException("Workspace not found");

      try {
        await assertPermission(db, user.id, workspace.id, "workspace:manage");
      } catch {
        throw new ForbiddenException("Unauthorized");
      }
    }

    const stripeCustomerId = await this.ensureCustomer(user);

    let subscriptionId: number | undefined;
    if (input.workspacePublicId) {
      const subscription = await subscriptionRepo.create(db, {
        plan: input.plan,
        referenceId: workspacePublicId,
        stripeCustomerId,
        status: "incomplete",
      });
      subscriptionId = subscription?.id;
      if (!subscriptionId)
        throw new InternalServerErrorException("Error creating subscription");
    }

    const monthlyPriceId = process.env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID;
    const priceId =
      input.billing === "annual"
        ? (process.env.STRIPE_TEAM_PLAN_YEARLY_PRICE_ID ?? monthlyPriceId)
        : monthlyPriceId;

    const session = await createStripeClient().checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        billing_mode: subscriptionBillingMode,
        ...(subscriptionId && {
          metadata: { subscriptionId: String(subscriptionId) },
        }),
      },
      success_url: `${baseUrl()}${input.successUrl}?workspacePublicId=${workspacePublicId}`,
      cancel_url: `${baseUrl()}${input.cancelUrl}`,
      client_reference_id: workspacePublicId,
      customer: stripeCustomerId,
      metadata: {
        workspacePublicId,
        userId: user.id,
        userEmail: user.email,
        ...(input.workspaceSlug && { workspaceSlug: input.workspaceSlug }),
        ...(input.workspaceName && { workspaceName: input.workspaceName }),
        ...(input.workspaceDescription && {
          workspaceDescription: input.workspaceDescription,
        }),
        ...(subscriptionId && { subscriptionId: String(subscriptionId) }),
        plan: input.plan,
        isNewWorkspace: input.workspaceName ? "true" : "false",
      },
    });

    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const stripeCustomerId = (await userRepo.getById(db, userId))
      ?.stripeCustomerId;
    if (!stripeCustomerId)
      throw new NotFoundException("No billing account found");

    const session = await createStripeClient().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl()}/settings`,
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = createStripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      );
    } catch (err) {
      log.warn({ err }, "Rejected Stripe webhook");
      throw new BadRequestException("Webhook handler failed");
    }

    log.info({ eventType: event.type, eventId: event.id }, "Stripe event");

    switch (event.type) {
      case "checkout.session.completed":
        return this.onCheckoutCompleted(stripe, event.data.object);
      case "customer.subscription.created":
      case "customer.subscription.updated":
        return this.onSubscriptionChanged(event.data.object);
      case "customer.subscription.deleted":
        return this.onSubscriptionDeleted(event.data.object);
      default:
        log.warn({ eventType: event.type }, "Unhandled Stripe event type");
    }
  }

  private async onCheckoutCompleted(
    stripe: Stripe,
    session: Stripe.Checkout.Session,
  ) {
    const meta = session.metadata;
    const stripeSubscriptionId = idOf(session.subscription);
    if (
      session.mode !== "subscription" ||
      !meta?.workspacePublicId ||
      !stripeSubscriptionId
    )
      return;

    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const fields = syncedFields(sub);
    const plan = fields.plan ?? (meta.plan === "pro" ? "pro" : "team");

    if (meta.isNewWorkspace === "true") {
      if (!meta.workspaceName || !meta.userId || !meta.userEmail) return;
      const existing = await workspaceRepo.getByPublicId(
        db,
        meta.workspacePublicId,
      );
      if (!existing)
        await workspaceRepo.create(db, {
          publicId: meta.workspacePublicId,
          name: meta.workspaceName,
          slug: meta.workspaceSlug ?? meta.workspacePublicId,
          plan,
          createdBy: meta.userId,
          createdByEmail: meta.userEmail,
          ...(meta.workspaceDescription && {
            description: meta.workspaceDescription,
          }),
        });
    } else {
      await workspaceRepo.update(db, meta.workspacePublicId, { plan });
    }

    const row = await findRow(sub);
    const values = { ...fields, plan, referenceId: meta.workspacePublicId };
    if (row) await subscriptionRepo.updateById(db, row.id, values);
    else await subscriptionRepo.create(db, values);

    if (plan === "pro") {
      const workspace = await workspaceRepo.getByPublicId(
        db,
        meta.workspacePublicId,
      );
      if (workspace) await memberRepo.unpauseAllMembers(db, workspace.id);
    }
  }

  /** Rows are created at checkout; subscription events only keep them in sync. */
  private async onSubscriptionChanged(sub: Stripe.Subscription) {
    const row = await findRow(sub);
    if (!row) {
      log.warn(
        { stripeSubscriptionId: sub.id },
        "No subscription row for Stripe subscription",
      );
      return;
    }

    const fields = syncedFields(sub);
    await subscriptionRepo.updateById(db, row.id, fields);

    if (
      row.referenceId &&
      fields.plan &&
      (sub.status === "active" || sub.status === "trialing")
    )
      await workspaceRepo.update(db, row.referenceId, { plan: fields.plan });
  }

  private async onSubscriptionDeleted(sub: Stripe.Subscription) {
    const row = await subscriptionRepo.getByStripeSubscriptionId(db, sub.id);
    if (!row) return;

    await subscriptionRepo.updateById(db, row.id, {
      ...syncedFields(sub),
      status: "canceled",
      stripeScheduleId: null,
    });
    if (row.referenceId) await cancelWorkspaceAccess(db, row.referenceId);
  }
}
