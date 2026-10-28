export const workspacePlans = ["free", "team", "pro", "enterprise"] as const;
export type WorkspacePlan = (typeof workspacePlans)[number];

export const PAID_WORKSPACE_PLANS = new Set<WorkspacePlan>([
  "team",
  "pro",
  "enterprise",
]);

export const isPaidWorkspacePlan = (plan: string): boolean =>
  PAID_WORKSPACE_PLANS.has(plan as WorkspacePlan);
