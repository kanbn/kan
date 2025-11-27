import type { NextApiRequest, NextApiResponse } from "next";
import { Novu } from "@novu/api";
import { jwtVerify } from "jose";
import { z } from "zod";

import { env } from "~/env";

const requestSchema = z.object({
  token: z.string().min(1),
});

const tokenPayloadSchema = z.object({
  subscriberId: z.string(),
});

type ResponseData =
  | { success: true }
  | { success: false; error: string; code?: string };

const textEncoder = new TextEncoder();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (process.env.NEXT_PUBLIC_KAN_ENV !== "cloud") {
    return res.status(404).json({
      success: false,
      error: "Unsubscribe endpoint is not available.",
      code: "UNAVAILABLE",
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed.",
      code: "METHOD_NOT_ALLOWED",
    });
  }

  const parsedBody = requestSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid request payload.",
      code: "BAD_REQUEST",
    });
  }

  if (!env.EMAIL_UNSUBSCRIBE_SECRET || !env.NOVU_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Unsubscribe service is not configured.",
      code: "NOT_CONFIGURED",
    });
  }

  let payload: z.infer<typeof tokenPayloadSchema>;

  try {
    const verified = await jwtVerify(
      parsedBody.data.token,
      textEncoder.encode(env.EMAIL_UNSUBSCRIBE_SECRET),
      {
        // We intentionally do not use exp/iat claims –
        // tokens are long-lived and validated only by signature + payload.
        clockTolerance: "0s",
      },
    );
    payload = tokenPayloadSchema.parse(verified.payload);
  } catch {
    return res.status(401).json({
      success: false,
      error: "Your unsubscribe link is invalid or has expired.",
      code: "INVALID_TOKEN",
    });
  }

  const novu = new Novu({ secretKey: env.NOVU_API_KEY });

  try {
    await novu.subscribers.preferences.update(
      {
        channels: {
          email: false,
        },
      },
      payload.subscriberId,
    );
  } catch (error) {
    console.error("Failed to update Novu preferences", error);
    return res.status(502).json({
      success: false,
      error:
        "We could not update your email preferences right now. Please try again later.",
      code: "NOVU_ERROR",
    });
  }

  return res.status(200).json({ success: true });
}
