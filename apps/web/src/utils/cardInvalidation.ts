import type { CardCache } from "~/utils/cardCache";

/**
 * Invalidates all card-related queries for a given card.
 * Use this after any mutation that affects card data or activities.
 */
export async function invalidateCard(
  cardCache: CardCache,
  cardPublicId: string,
) {
  if (!cardPublicId || cardPublicId.length < 12) return;

  await Promise.all([
    cardCache.byId.invalidate({ cardPublicId }),
    cardCache.getActivities.invalidate({ cardPublicId }),
  ]);
}
