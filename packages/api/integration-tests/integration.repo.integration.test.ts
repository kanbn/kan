import { describe, expect, it } from "vitest";

import * as integrationsRepo from "@kan/db/repository/integration.repo";

import { createTestDb, seedTestData } from "./test-db";

describe("integration repository", () => {
  it("replaces a legacy access token only while it is still current", async () => {
    const db = await createTestDb();
    const { user } = await seedTestData(db);

    await integrationsRepo.createOrUpdateProvider(db, {
      provider: "trello",
      userId: user.id,
      accessToken: "legacy-token",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });

    await integrationsRepo.updateAccessTokenIfCurrent(db, {
      provider: "trello",
      userId: user.id,
      currentAccessToken: "legacy-token",
      accessToken: "encrypted-token",
    });
    await integrationsRepo.updateAccessTokenIfCurrent(db, {
      provider: "trello",
      userId: user.id,
      currentAccessToken: "legacy-token",
      accessToken: "stale-token",
    });

    const integration = await integrationsRepo.getProviderForUser(
      db,
      user.id,
      "trello",
    );
    expect(integration?.accessToken).toBe("encrypted-token");
  });

  it("does not return credentials when listing providers", async () => {
    const db = await createTestDb();
    const { user } = await seedTestData(db);

    await integrationsRepo.createOrUpdateProvider(db, {
      provider: "trello",
      userId: user.id,
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });

    const [provider] = await integrationsRepo.getProvidersForUser(db, user.id);

    expect(provider).toMatchObject({ provider: "trello", userId: user.id });
    expect(provider).not.toHaveProperty("accessToken");
    expect(provider).not.toHaveProperty("refreshToken");
  });
});
