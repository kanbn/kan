import { createDrizzleClient } from "@kan/db/client";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { subscription } from "@kan/db/schema";

let db: ReturnType<typeof createDrizzleClient> | undefined;

function getDb() {
  db ??= createDrizzleClient();
  return db;
}

export async function seedGrandfatheredProSubscription(
  workspacePublicId: string,
) {
  const client = getDb();

  const workspace = await workspaceRepo.getByPublicId(
    client,
    workspacePublicId,
  );
  if (!workspace) {
    throw new Error(`Workspace ${workspacePublicId} not found`);
  }

  await workspaceRepo.update(client, workspacePublicId, { plan: "pro" });

  await client.insert(subscription).values({
    plan: "pro",
    referenceId: workspacePublicId,
    stripeCustomerId: `cus_e2e_seeded_${Date.now()}`,
    status: "active",
    unlimitedSeats: true,
  });
}
