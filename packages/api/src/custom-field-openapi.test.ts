import { describe, expect, it, vi } from "vitest";

vi.mock("@kan/auth/server", () => ({
  initAuth: vi.fn(() => ({ api: {} })),
}));

vi.mock("@kan/db/client", () => ({
  createDrizzleClient: vi.fn(() => ({})),
}));

describe("custom field OpenAPI", () => {
  it("publishes custom field filters as string query parameters", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-only-openapi-secret-123456789");
    const { openApiDocument } = await import("./openapi");
    const operation = openApiDocument.paths?.["/boards/{boardPublicId}"]?.get;

    expect(operation).toBeDefined();
    const parameters = JSON.stringify(operation?.parameters);
    expect(parameters).toContain('"name":"customFields"');
    expect(parameters).toContain('"type":"array","items":{"type":"string"');
  }, 10_000);
});
