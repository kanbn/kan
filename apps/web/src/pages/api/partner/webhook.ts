import { createHmac, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";

import { tierConfig } from "./_utils";

const log = createLogger("api");

async function buffer(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
): boolean {
  const secret = process.env.PARTNER_API_KEY;
  if (!secret) return false;

  const ts = Number(timestamp);
  if (isNaN(ts) || Date.now() - ts > 300_000) return false;

  const payload = `${timestamp}${rawBody}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

interface WebhookPayload {
  event:
    | "purchase"
    | "activate"
    | "deactivate"
    | "upgrade"
    | "downgrade"
    | "migrate";
  license_key: string;
  license_status: string;
  tier: number;
  prev_license_key?: string;
}

export default withApiLogging(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const signatureHeader = process.env.PARTNER_SIGNATURE_HEADER;
    const timestampHeader = process.env.PARTNER_TIMESTAMP_HEADER;

    if (!signatureHeader || !timestampHeader) {
      log.error("Webhook signature headers not configured");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const signature = req.headers[signatureHeader] as string | undefined;
    const timestamp = req.headers[timestampHeader] as string | undefined;

    if (!signature || !timestamp) {
      return res.status(400).json({ message: "Missing signature headers" });
    }

    const buf = await buffer(req as unknown as Readable);
    const rawBody = buf.toString("utf8");

    if (!verifySignature(rawBody, signature, timestamp)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const { event, license_key, license_status, tier, prev_license_key } =
      payload;

    log.info({ headers: req.headers, payload }, "partner webhook received");

    const { db } = await createNextApiContext(req);

    switch (event) {
      case "purchase": {
        const cfg = tierConfig(tier);
        await subscriptionRepo.upsertByPartnerLicenseKey(db, license_key, {
          plan: cfg.plan,
          status: license_status,
          partnerTier: tier,
          seats: cfg.seats,
          unlimitedSeats: cfg.unlimitedSeats,
        });
        break;
      }

      case "activate": {
        const cfg = tierConfig(tier);
        await subscriptionRepo.upsertByPartnerLicenseKey(db, license_key, {
          plan: cfg.plan,
          status: "active",
          partnerTier: tier,
          seats: cfg.seats,
          unlimitedSeats: cfg.unlimitedSeats,
        });
        break;
      }

      case "deactivate": {
        const sub = await subscriptionRepo.getByPartnerLicenseKey(
          db,
          license_key,
        );
        if (sub) {
          await subscriptionRepo.updateById(db, sub.id, {
            plan: "free",
            status: "inactive",
          });
          if (sub.referenceId) {
            await workspaceRepo.update(db, sub.referenceId, { plan: "free" });
          }
        }
        break;
      }

      case "upgrade":
      case "downgrade": {
        const sub = await subscriptionRepo.getByPartnerLicenseKey(
          db,
          license_key,
        );
        if (sub) {
          const cfg = tierConfig(tier);
          await subscriptionRepo.upsertByPartnerLicenseKey(db, license_key, {
            plan: cfg.plan,
            status: "active",
            partnerTier: tier,
            seats: cfg.seats,
            unlimitedSeats: cfg.unlimitedSeats,
          });
          if (sub.referenceId) {
            await workspaceRepo.update(db, sub.referenceId, { plan: cfg.plan });
          }
        }
        break;
      }

      case "migrate": {
        if (prev_license_key) {
          const sub = await subscriptionRepo.getByPartnerLicenseKey(
            db,
            prev_license_key,
          );
          if (sub) {
            const cfg = tierConfig(tier);
            await subscriptionRepo.upsertByPartnerLicenseKey(db, license_key, {
              plan: cfg.plan,
              status: "active",
              partnerTier: tier,
              seats: cfg.seats,
              unlimitedSeats: cfg.unlimitedSeats,
              referenceId: sub.referenceId ?? undefined,
            });
            await subscriptionRepo.updateById(db, sub.id, {
              status: "inactive",
            });
          }
        }
        break;
      }

      default:
        log.warn({ event }, "Unhandled partner webhook event");
    }

    return res.status(200).json({ success: true, event });
  },
);

export const config = {
  api: {
    bodyParser: false,
  },
};
