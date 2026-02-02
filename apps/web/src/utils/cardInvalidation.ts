import type { api } from "~/utils/api";

/**
 * Invalidates all card-related queries for a given card.
 * Use this after any mutation that affects card data or activities.
 */
export async function invalidateCard(
  utils: ReturnType<typeof api.useUtils>,
  cardPublicId: string,
) {
  if (!cardPublicId || cardPublicId.length < 12) return;
  
  await Promise.all([
    utils.card.byId.invalidate({ cardPublicId }),
    utils.card.getActivities.invalidate({ cardPublicId }),
  ]);
}

