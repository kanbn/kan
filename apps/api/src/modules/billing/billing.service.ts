import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { assertPermission } from "@kan/server/utils/permissions";
import { generateUID } from "@kan/shared/utils";
import { createStripeClient, subscriptionBillingMode } from "@kan/stripe";

import type { User } from "../../common/interfaces/user.interface.js";
import type { CreateCheckoutSessionDto } from "./dto/billing.dto.js";
import { db } from "../../common/session.util.js";

const log = createLogger("billing");

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL ?? "";

@Injectable()
export class BillingService {
  async createCheckoutSession(user: User, input: CreateCheckoutSessionDto) {
    if (input.plan !== "team")
      throw new BadRequestException(
        "The Pro plan is no longer available. Please choose Team.",
      );

    const { stripeCustomerId } = (await userRepo.getById(db, user.id)) ?? {};
    const workspacePublicId = input.workspacePublicId ?? generateUID();
    let subscriptionId: number | undefined;

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

      const subscription = await subscriptionRepo.create(db, {
        plan: input.plan,
        referenceId: workspacePublicId,
        userId: user.id,
        stripeCustomerId: stripeCustomerId ?? "",
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
      customer: stripeCustomerId ?? undefined,
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
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET_LEGACY ?? "",
      );
    } catch {
      throw new BadRequestException("Webhook handler failed");
    }

    log.info({ eventType: event.type, eventId: event.id }, "Stripe event");

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        const meta = checkoutSession.metadata;
        if (!meta?.workspacePublicId) break;

        const plan = meta.plan === "team" ? "team" : ("pro" as const);

        if (
          meta.isNewWorkspace === "true" &&
          meta.workspaceName &&
          meta.userId &&
          meta.userEmail
        ) {
          const existing = await workspaceRepo.getByPublicId(
            db,
            meta.workspacePublicId,
          );
          if (existing) break;

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

          await subscriptionRepo.create(db, {
            plan,
            referenceId: meta.workspacePublicId,
            userId: meta.userId,
            stripeCustomerId: checkoutSession.customer as string,
            stripeSubscriptionId:
              typeof checkoutSession.subscription === "string"
                ? checkoutSession.subscription
                : checkoutSession.subscription?.id,
            status: "active",
          });
        } else {
          await workspaceRepo.update(db, meta.workspacePublicId, {
            plan,
            ...(plan === "pro" &&
              meta.workspaceSlug && { slug: meta.workspaceSlug }),
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price.id;
        if (!priceId) break;

        const isTeamPrice = [
          process.env.STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID,
          process.env.STRIPE_TEAM_PLAN_YEARLY_PRICE_ID,
        ].includes(priceId);
        const isProPrice = [
          process.env.STRIPE_PRO_PLAN_MONTHLY_PRICE_ID,
          process.env.STRIPE_PRO_PLAN_YEARLY_PRICE_ID,
        ].includes(priceId);
        if (!isTeamPrice && !isProPrice) break;

        const subscriptionRow =
          await subscriptionRepo.getByStripeSubscriptionId(db, subscription.id);
        if (!subscriptionRow?.referenceId) break;

        await workspaceRepo.update(db, subscriptionRow.referenceId, {
          plan: isTeamPrice ? "team" : "pro",
        });
        break;
      }
      default:
        log.warn({ eventType: event.type }, "Unhandled Stripe event type");
    }
  }
}
