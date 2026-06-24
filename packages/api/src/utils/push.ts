import type { dbClient } from "@banana/db/client";
import { env } from "next-runtime-env";
import webpush from "web-push";

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

let configState: boolean | null = null;

const ensureConfigured = (): boolean => {
  if (configState !== null) return configState;

  if (env("NEXT_PUBLIC_DISABLE_PUSH")?.toLowerCase() === "true") {
    configState = false;
    return false;
  }

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
        const subscription = JSON.parse(
          s.subscriptionJson,
        ) as webpush.PushSubscription;
        await webpush.sendNotification(subscription, message);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await pushSubscriptionRepo.deleteByEndpoint(db, s.endpoint);
        } else {
          log.error({ err, statusCode }, "Failed to send push notification");
        }
      }
    }),
  );
};
