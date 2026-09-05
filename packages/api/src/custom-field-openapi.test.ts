import { describe, expect, it, vi } from "vitest";

vi.mock("@kan/auth/server", () => ({
  initAuth: vi.fn(() => ({ api: {} })),
}));

vi.mock("@kan/db/client", () => ({
  createDrizzleClient: vi.fn(() => ({})),
}));

describe("custom field OpenAPI", () => {
  it("publishes filters and initial select options", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-only-openapi-secret-123456789");
    const { openApiDocument } = await import("./openapi");
    const operation = openApiDocument.paths?.["/boards/{boardPublicId}"]?.get;

    expect(operation).toBeDefined();
    const parameters = JSON.stringify(operation?.parameters);
    expect(parameters).toContain('"name":"customFields"');
    expect(parameters).toContain('"type":"array","items":{"type":"string"');

    const createOperation =
      openApiDocument.paths?.["/boards/{boardPublicId}/custom-fields"]?.post;
    expect(createOperation).toBeDefined();
    const requestBody = JSON.stringify(createOperation?.requestBody);
    expect(requestBody).toContain('"options"');
    expect(requestBody).toContain('"name"');
    expect(requestBody).toContain('"colourCode"');
  }, 10_000);
});
