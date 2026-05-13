export type WorkspacePlan = "free" | "team" | "pro" | "enterprise";

export interface TierConfig {
  plan: WorkspacePlan;
  seats: number | null;
  unlimitedSeats: boolean;
}

const TIER_MAP: Record<number, TierConfig> = {
  1: { plan: "team", seats: 5, unlimitedSeats: false },
  2: { plan: "pro", seats: 15, unlimitedSeats: false },
  3: { plan: "pro", seats: null, unlimitedSeats: true },
};

export function tierConfig(tier: number): TierConfig {
  const config = TIER_MAP[tier];
  if (!config) throw new Error(`Unknown partner tier: ${tier}`);
  return config;
}
