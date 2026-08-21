import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@banana/api/trpc";
import { withApiLogging } from "@banana/api/utils/apiLogging";
import { withRateLimit } from "@banana/api/utils/rateLimit";
import * as unblockAckRepo from "@banana/db/repository/cardUnblockAck.repo";
import { createLogger } from "@banana/logger";

const log = createLogger("mattermost-unblock-confirm");

type ConfirmResponse = {
  update?: { message: string; props: { attachments: unknown[] } };
  ephemeral_text?: string;
};

/** Render a minimal, self-contained HTML page for the magic-link confirm flow. */
function htmlPage(res: NextApiResponse, heading: string, glyph: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Banana — Confirm unblock</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
    background:#f6f7f9;color:#1a1a1a;margin:0;display:flex;min-height:100vh;
    align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e3e5e8;border-radius:12px;
    max-width:420px;padding:32px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .glyph{font-size:40px;line-height:1}
  h1{font-size:18px;margin:14px 0 6px}
  p{margin:0;color:#5e6c7c;font-size:14px;line-height:1.5}
</style></head>
<body><div class="card"><div class="glyph">${glyph}</div>
<h1>${heading}</h1><p>You can close this tab.</p></div></body></html>`);
}

/**
 * Mattermost delivers attachment-action callbacks as
 * `application/x-www-form-urlencoded` with a single `payload` field whose value
 * is a JSON string: `payload={"user_id":…,"context":{"ack":…},…}`. Next.js
 * parses that into `req.body = { payload: "<json>" }`, so the real fields live
 * one JSON.parse deeper — reading `req.body.context` directly always yields
 * undefined and the button silently no-ops. For raw-JSON callers `req.body` is
 * the object itself.
 *
 * NOTE: current Mattermost strips the `integration` callback URL from stored
 * attachment actions, so this POST callback is effectively unreachable; the
 * live confirm path is the GET magic link below.
 */
function extractActionPayload(
  req: NextApiRequest,
): Record<string, unknown> {
  const raw = req.body;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  if (raw && typeof raw.payload === "string") {
    try {
      const parsed = JSON.parse(raw.payload);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return (raw ?? {}) as Record<string, unknown>;
}

/**
 * Two confirm entry points:
 *  - GET  /api/mattermost/unblock-confirm?ack=<ackPublicId>  ← the live flow.
 *    The DM embeds this link; opening it in any browser marks the ack
 *    confirmed (the unguessable ack token is the credential).
 *  - POST with Mattermost's form-urlencoded `payload`  ← legacy attachment
 *    action callback, currently unreachable (see note above) but kept correct.
 */
async function handler(req: NextApiRequest, res: NextApiResponse<ConfirmResponse>) {
  if (req.method === "GET") {
    const ackPublicId =
      typeof req.query.ack === "string" ? req.query.ack : "";
    if (!ackPublicId) {
      htmlPage(res, "Invalid confirmation link", "⚠️");
      return;
    }
    try {
      const { db } = await createNextApiContext(req);
      const ack = await unblockAckRepo.getByPublicId(db, ackPublicId);
      if (!ack) {
        htmlPage(res, "Notification not found", "⚠️");
        return;
      }
      const already = !!ack.confirmedAt;
      if (!already) {
        await unblockAckRepo.markConfirmed(db, ackPublicId);
      }
      htmlPage(res, already ? "Already confirmed" : "Unblock confirmed", "✅");
      return;
    } catch (error) {
      log.error({ err: error }, "unblock-confirm GET error");
      htmlPage(res, "Something went wrong", "⚠️");
      return;
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ephemeral_text: "Method not allowed" });
  }

  // Legacy Mattermost attachment-action callback (currently unreachable; see
  // note above). Kept correct in case attachment actions are ever re-enabled.
  const payload = extractActionPayload(req);
  const context = (payload.context ?? {}) as { ack?: unknown };
  const ackPublicId: string =
    typeof context.ack === "string"
      ? context.ack
      : typeof payload.ack === "string"
        ? payload.ack
        : "";
  const mmUserId: string =
    typeof payload.user_id === "string" ? payload.user_id : "";

  if (!ackPublicId || !mmUserId) {
    return res.json({ ephemeral_text: "Invalid confirmation link." });
  }

  try {
    const { db } = await createNextApiContext(req);
    const ack = await unblockAckRepo.getByPublicIdAndMmUser(
      db,
      ackPublicId,
      mmUserId,
    );
    if (!ack) {
      return res.json({
        ephemeral_text: "This notification could not be confirmed.",
      });
    }

    if (!ack.confirmedAt) {
      await unblockAckRepo.markConfirmed(db, ackPublicId);
    }

    // Update the original post: keep the message, append ✅, remove the button.
    return res.json({
      update: {
        message: `${ack.messageText}\n\n✅ Confirmed`,
        props: { attachments: [] },
      },
    });
  } catch (error) {
    log.error({ err: error }, "unblock-confirm endpoint error");
    return res.json({
      ephemeral_text: "Something went wrong while confirming.",
    });
  }
}

export default withRateLimit(
  { points: 30, duration: 60 },
  withApiLogging(handler),
);
