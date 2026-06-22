import webpush from "web-push";
import { env } from "next-runtime-env";

import type { dbClient } from "@banana/db/client";
import * as pushSubscriptionRepo from "@banana/db/repository/pushSubscription.repo";
import { createLogger } from "@banana/logger";

const log = createLogger("push");

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

export interface PushPayload {
  title: string;
  body?: string;
  /** Path or URL the client opens when the notification is clicked. */
  url?: string;
}

/**
 * Lazily configures `web-push` on first use. Intentionally fail-soft: a
 * missing/invalid VAPID config disables push but must NEVER throw into the
 * module graph — otherwise importing this file (via the tRPC router) would
 * crash the whole API at startup.
 *
 * web-push requires the subject to be `https:` or `mailto:`. In local dev
 * NEXT_PUBLIC_BASE_URL is `http://localhost` (rejected), so we only use it
 * when it is actually https and fall back to a mailto: otherwise.
 */
let configState: boolean | null = null;

const ensureConfigured = (): boolean => {
  if (configState !== null) return configState;

  if (!publicKey || !privateKey) {
    log.warn(
      "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set — web push disabled",
    );
    configState = false;
    return false;
  }

  const baseUrl = env("NEXT_PUBLIC_BASE_URL");
  const subject = baseUrl?.startsWith("https://")
    ? baseUrl
    : "mailto:noreply@example.com";

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configState = true;
  } catch (err) {
    log.error({ err, subject }, "Failed to configure web-push; push disabled");
    configState = false;
  }

  return configState;
};

/**
 * Sends a push notification to every device/browser a user has subscribed from.
 * Independent of Stripe and email — this is the only "transport" besides
 * `sendEmail`. Never throws into the caller's flow: failures are logged and
 * stale subscriptions (410/404) are pruned.
 */
export const sendPushToUser = async (
  db: dbClient,
  userId: string,
  payload: PushPayload,
) => {
  if (!ensureConfigured()) return;

  const subs = await pushSubscriptionRepo.getByUser(db, userId);
  if (subs.length === 0) return;

  const message = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        const subscription = JSON.parse(s.subscriptionJson) as webpush.PushSubscription;
        await webpush.sendNotification(subscription, message);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 410 Gone / 404 → the subscription is no longer valid (user revoked
        // permission, uninstalled, etc.). Drop it so the table stays clean.
        if (statusCode === 410 || statusCode === 404) {
          await pushSubscriptionRepo.deleteByEndpoint(db, s.endpoint);
        } else {
          log.error({ err, statusCode }, "Failed to send push notification");
        }
      }
    }),
  );
};
