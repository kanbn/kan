import { z } from "zod";

const rawWipLimitInputSchema = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;

  return value;
}, z.number().int().min(0).nullable().optional());

export const listCreateWipLimitSchema = rawWipLimitInputSchema.transform(
  (value) => {
    if (!value || value <= 0) return null;

    return value;
  },
);

export const listUpdateWipLimitSchema = rawWipLimitInputSchema.transform(
  (value) => {
    if (value === undefined) return undefined;
    if (!value || value <= 0) return null;

    return value;
  },
);

// ─── list.create ─────────────────────────────────────────────
export const listCreateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  wipLimit: z.number().int().nullable(),
});

// ─── list.update / list.reorder ──────────────────────────────
export const listUpdateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  wipLimit: z.number().int().nullable(),
});
