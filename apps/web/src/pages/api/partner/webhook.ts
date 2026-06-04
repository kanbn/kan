import { createHmac, timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";

import type { dbClient } from "@kan/db/client";
import { createNextApiContext } from "@kan/api/trpc";
import { withApiLogging } from "@kan/api/utils/apiLogging";
import { cancelWorkspaceAccess } from "@kan/api/utils/workspace";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { createLogger } from "@kan/logger";
import { getActiveSubscriptions } from "@kan/shared/utils";

import type { TierConfig } from "./_utils";
import { tierConfig } from "./_utils";

const log = createLogger("api");

async function createAndLinkSlots(
  db: dbClient,
  licenseKey: string,
  cfg: TierConfig,
  tier: number,
  alreadyLinkedReferenceIds: Set<string>,
  count: number,
) {
  const linkedId = [...alreadyLinkedReferenceIds][0];
  let autoLinked = 0;

  if (linkedId) {
    const linkedWorkspace = await workspaceRepo.getByPublicId(db, linkedId);

    if (linkedWorkspace?.createdBy) {
      const owned = await workspaceRepo.getAllOwnedByUserId(
        db,
        linkedWorkspace.createdBy,
      );

      const candidates = owned.filter(
        (w) => !alreadyLinkedReferenceIds.has(w.publicId),
      );

      if (candidates.length > 0) {
        const existingSubs =
          await subscriptionRepo.getAllActivePartnerSubsByWorkspaceIds(
            db,
            candidates.map((w) => w.publicId),
          );
        const alreadySubscribed = new Set(
          existingSubs
            .map((s) => s.referenceId)
            .filter((id): id is string => !!id),
        );

        const available = candidates
          .filter((w) => !alreadySubscribed.has(w.publicId))
          .slice(0, count);

        if (available.length > 0) {
          const newSlots = await subscriptionRepo.createPartnerLicenseSlots(
            db,
            licenseKey,
            {
              plan: cfg.plan,
              status: "active",
              partnerTier: tier,
              seats: cfg.seats,
              unlimitedSeats: cfg.unlimitedSeats,
            },
            available.length,
          );

          await Promise.all(
            available.map((workspace, i) => {
              const slot = newSlots[i];
              if (!slot) return;
              return Promise.all([
                subscriptionRepo.updateById(db, slot.id, {
                  referenceId: workspace.publicId,
                }),
                workspaceRepo.update(db, workspace.publicId, {
                  plan: cfg.plan,
                }),
              ]);
            }),
          );

          autoLinked = available.length;
        }
      }
    }
  }

  const remaining = count - autoLinked;
  if (remaining > 0) {
    await subscriptionRepo.createPartnerLicenseSlots(
      db,
      licenseKey,
      {
        plan: cfg.plan,
        status: "active",
        partnerTier: tier,
        seats: cfg.seats,
        unlimitedSeats: cfg.unlimitedSeats,
      },
      remaining,
    );
  }
}

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

function hasReferenceId<T extends { referenceId: string | null | undefined }>(
  s: T,
): s is T & { referenceId: string } {
  return !!s.referenceId;
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
      case "purchase":
      case "activate": {
        const cfg = tierConfig(tier);
        const existing = await subscriptionRepo.getAllByPartnerLicenseKey(
          db,
          license_key,
        );
        const status = event === "activate" ? "active" : license_status;

        if (existing.length === 0) {
          await subscriptionRepo.createPartnerLicenseSlots(
            db,
            license_key,
            {
              plan: cfg.plan,
              status,
              partnerTier: tier,
              seats: cfg.seats,
              unlimitedSeats: cfg.unlimitedSeats,
            },
            cfg.workspaceSlots,
          );
        } else {
          await subscriptionRepo.updateAllByPartnerLicenseKey(db, license_key, {
            plan: cfg.plan,
            status,
            partnerTier: tier,
            seats: cfg.seats,
            unlimitedSeats: cfg.unlimitedSeats,
          });
        }
        break;
      }

      case "deactivate": {
        const allSlots = await subscriptionRepo.getAllByPartnerLicenseKey(
          db,
          license_key,
        );

        await Promise.all(
          allSlots.filter(hasReferenceId).map(async (slot) => {
            const siblingSubs = await subscriptionRepo.getByReferenceId(
              db,
              slot.referenceId,
            );
            const hasOtherActiveSub = getActiveSubscriptions(siblingSubs).some(
              (s) => s.id !== slot.id,
            );
            if (!hasOtherActiveSub) {
              await cancelWorkspaceAccess(db, slot.referenceId);
            }
          }),
        );

        await subscriptionRepo.updateAllByPartnerLicenseKey(db, license_key, {
          plan: "free",
          status: "canceled",
          unlimitedSeats: false,
          seats: null,
        });

        break;
      }

      case "upgrade":
      case "downgrade": {
        const lookupKey = prev_license_key ?? license_key;
        const existing = await subscriptionRepo.getAllByPartnerLicenseKey(
          db,
          lookupKey,
        );

        if (existing.length === 0) break;

        const cfg = tierConfig(tier);
        const newCount = cfg.workspaceSlots;

        // Prefer keeping linked slots; among linked, keep in insertion order (LIFO removal)
        const preferKeep = [
          ...existing.filter((s) => s.referenceId),
          ...existing.filter((s) => !s.referenceId),
        ];

        const slotsToKeep = preferKeep.slice(0, newCount);
        const slotsToRemove = preferKeep.slice(newCount);

        await Promise.all([
          ...slotsToKeep.map((slot) =>
            subscriptionRepo.updateById(db, slot.id, {
              plan: cfg.plan,
              seats: cfg.seats,
              unlimitedSeats: cfg.unlimitedSeats,
              partnerTier: tier,
              status: "active",
              ...(prev_license_key ? { partnerLicenseKey: license_key } : {}),
            }),
          ),
          ...slotsToKeep
            .filter(hasReferenceId)
            .map((s) =>
              workspaceRepo.update(db, s.referenceId, { plan: cfg.plan }),
            ),
        ]);

        if (newCount > existing.length) {
          const linkedIds = new Set(
            slotsToKeep.filter(hasReferenceId).map((s) => s.referenceId),
          );
          await createAndLinkSlots(
            db,
            license_key,
            cfg,
            tier,
            linkedIds,
            newCount - existing.length,
          );
        }

        if (slotsToRemove.length > 0) {
          await Promise.all([
            ...slotsToRemove
              .filter(hasReferenceId)
              .map((s) => cancelWorkspaceAccess(db, s.referenceId)),
            ...slotsToRemove.map((s) =>
              subscriptionRepo.updateById(db, s.id, {
                plan: "free",
                status: "inactive",
                unlimitedSeats: false,
                seats: null,
              }),
            ),
          ]);
        }

        break;
      }

      case "migrate": {
        if (!prev_license_key) break;

        const existing = await subscriptionRepo.getAllByPartnerLicenseKey(
          db,
          prev_license_key,
        );
        if (existing.length === 0) break;

        const cfg = tierConfig(tier);
        const newCount = cfg.workspaceSlots;

        const preferKeep = [
          ...existing.filter((s) => s.referenceId),
          ...existing.filter((s) => !s.referenceId),
        ];

        const slotsToKeep = preferKeep.slice(0, newCount);
        const slotsToRemove = preferKeep.slice(newCount);

        await Promise.all([
          ...slotsToKeep.map((slot) =>
            subscriptionRepo.updateById(db, slot.id, {
              partnerLicenseKey: license_key,
              plan: cfg.plan,
              status: "active",
              partnerTier: tier,
              seats: cfg.seats,
              unlimitedSeats: cfg.unlimitedSeats,
            }),
          ),
          ...slotsToKeep
            .filter(hasReferenceId)
            .map((s) =>
              workspaceRepo.update(db, s.referenceId, { plan: cfg.plan }),
            ),
        ]);

        if (newCount > existing.length) {
          const linkedIds = new Set(
            slotsToKeep.filter(hasReferenceId).map((s) => s.referenceId),
          );
          await createAndLinkSlots(
            db,
            license_key,
            cfg,
            tier,
            linkedIds,
            newCount - existing.length,
          );
        }

        if (slotsToRemove.length > 0) {
          await Promise.all([
            ...slotsToRemove
              .filter(hasReferenceId)
              .map((s) => cancelWorkspaceAccess(db, s.referenceId)),
            ...slotsToRemove.map((s) =>
              subscriptionRepo.updateById(db, s.id, {
                plan: "free",
                status: "inactive",
                unlimitedSeats: false,
                seats: null,
              }),
            ),
          ]);
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
