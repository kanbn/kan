import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IntegrationController } from "../integration.controller.js";
import { IntegrationService } from "../integration.service.js";

const mockIntegrationService = {
  providers: vi.fn(),
  disconnect: vi.fn(),
  getAuthorizationUrl: vi.fn(),
  saveGitHubToken: vi.fn(),
  disconnectGitHub: vi.fn(),
  getGitHubStatus: vi.fn(),
};
const user = { id: "user_1", email: "henry@kan.bn" };

let controller: IntegrationController;

beforeEach(async () => {
  vi.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    controllers: [IntegrationController],
    providers: [
      { provide: IntegrationService, useValue: mockIntegrationService },
    ],
  }).compile();

  controller = module.get(IntegrationController);
});

describe("IntegrationController", () => {
  it("passes the current user's id and inputs through to each handler", async () => {
    await controller.providers(user as never);
    await controller.disconnect(user as never, { provider: "trello" } as never);
    await controller.getAuthorizationUrl(
      user as never,
      {
        provider: "trello",
      } as never,
    );
    await controller.saveGitHubToken(user as never, { token: "t" });
    await controller.disconnectGitHub(user as never);
    await controller.getGitHubStatus(user as never);

    const userId = { userId: "user_1" };
    expect(mockIntegrationService.providers).toHaveBeenCalledWith(userId);
    expect(mockIntegrationService.disconnect).toHaveBeenCalledWith({
      ...userId,
      provider: "trello",
    });
    expect(mockIntegrationService.getAuthorizationUrl).toHaveBeenCalledWith({
      ...userId,
      provider: "trello",
    });
    expect(mockIntegrationService.saveGitHubToken).toHaveBeenCalledWith({
      ...userId,
      token: "t",
    });
    expect(mockIntegrationService.disconnectGitHub).toHaveBeenCalledWith(
      userId,
    );
    expect(mockIntegrationService.getGitHubStatus).toHaveBeenCalledWith(userId);
  });
});
