import { z } from "zod";

// ─── member.invite ───────────────────────────────────────────
export const memberInviteResponseSchema = z.object({
  publicId: z.string(),
});
