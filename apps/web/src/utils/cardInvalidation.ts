import type { CardCache } from "~/utils/cardCache";

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
