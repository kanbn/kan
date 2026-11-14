import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as integrationsRepo from "@kan/db/repository/integration.repo";

import { IntegrationService } from "../integration.service.js";

let service: IntegrationService;
const originalKey = process.env.TRELLO_APP_API_KEY;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.TRELLO_APP_API_KEY = "trello-key";
  service = new IntegrationService();
});

afterEach(() => {
  process.env.TRELLO_APP_API_KEY = originalKey;
  vi.unstubAllEnvs();
});

describe("IntegrationService", () => {
  it("returns providers with ISO dates", async () => {
    vi.spyOn(integrationsRepo, "getProvidersForUser").mockResolvedValue([
      {
        provider: "trello",
        userId: "user_1",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: null,
      },
    ] as never);

    expect(await service.providers({ userId: "user_1" })).toEqual([
      {
        provider: "trello",
        userId: "user_1",
        expiresAt: "2027-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: null,
      },
    ]);
  });

  it("throws NOT_FOUND when disconnecting a provider that isn't connected", async () => {
    vi.spyOn(integrationsRepo, "getProviderForUser").mockResolvedValue(
      undefined,
    );

    await expect(
      service.disconnect({ userId: "user_1", provider: "trello" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("builds the Trello authorize URL when not yet connected", async () => {
    vi.spyOn(integrationsRepo, "getProviderForUser").mockResolvedValue(
      undefined,
    );

    const { url } = await service.getAuthorizationUrl({
      userId: "user_1",
      provider: "trello",
    });

    expect(url).toContain("/authorize?key=trello-key");
    expect(url).toContain("/settings/trello/authorize");
  });

  it("rejects an authorize request when Trello is already connected", async () => {
    vi.spyOn(integrationsRepo, "getProviderForUser").mockResolvedValue({
      provider: "trello",
    } as never);

    await expect(
      service.getAuthorizationUrl({ userId: "user_1", provider: "trello" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws when the Trello API key is not configured", async () => {
    delete process.env.TRELLO_APP_API_KEY;

    await expect(
      service.getAuthorizationUrl({ userId: "user_1", provider: "trello" }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("stores the GitHub token encrypted, never in plaintext", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret");
    const save = vi
      .spyOn(integrationsRepo, "createOrUpdateProvider")
      .mockResolvedValue(undefined);

    await service.saveGitHubToken({ userId: "user_1", token: "ghp_secret" });

    const stored = save.mock.calls[0]?.[1] as { accessToken: string };
    expect(stored.accessToken).not.toContain("ghp_secret");
    expect(stored.accessToken.length).toBeGreaterThan(0);
  });
});
