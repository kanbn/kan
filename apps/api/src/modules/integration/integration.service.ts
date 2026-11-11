import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import { encryptToken } from "@kan/api/utils/encryption";
import * as integrationsRepo from "@kan/db/repository/integration.repo";

import { db } from "../../common/session.util.js";

@Injectable()
export class IntegrationService {
  async providers(input: { userId: string }) {
    const integrations = await integrationsRepo.getProvidersForUser(
      db,
      input.userId,
    );

    return integrations.map((integration) => ({
      provider: integration.provider,
      userId: integration.userId,
      expiresAt: integration.expiresAt.toISOString(),
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt?.toISOString() ?? null,
    }));
  }

  async disconnect(input: { userId: string; provider: "trello" | "github" }) {
    const integration = await integrationsRepo.getProviderForUser(
      db,
      input.userId,
      input.provider,
    );

    if (!integration) throw new NotFoundException("Integration not found");

    await integrationsRepo.deleteProviderForUser(
      db,
      input.userId,
      input.provider,
    );

    return {};
  }

  async getAuthorizationUrl(input: { userId: string; provider: "trello" }) {
    const apiKey = process.env.TRELLO_APP_API_KEY;

    if (!apiKey)
      throw new InternalServerErrorException(
        "Trello API key not set in environment variables",
      );

    const integration = await integrationsRepo.getProviderForUser(
      db,
      input.userId,
      input.provider,
    );

    if (integration)
      throw new BadRequestException("Trello integration already exists");

    const trelloUrl = process.env.TRELLO_API_URL ?? "https://api.trello.com/1";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    return {
      url: `${trelloUrl}/authorize?key=${apiKey}&expiration=never&response_type=token&scope=read&return_url=${baseUrl}/settings/trello/authorize&callback_method=fragment`,
    };
  }

  async saveGitHubToken(input: { userId: string; token: string }) {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await integrationsRepo.createOrUpdateProvider(db, {
      provider: "github",
      userId: input.userId,
      accessToken: encryptToken(input.token),
      expiresAt,
    });

    return { success: true };
  }

  async disconnectGitHub(input: { userId: string }) {
    await integrationsRepo.deleteProviderForUser(db, input.userId, "github");
    return { success: true };
  }

  async getGitHubStatus(input: { userId: string }) {
    const connected = await integrationsRepo.isProviderAvailableForUser(
      db,
      input.userId,
      "github",
    );
    return { connected };
  }
}
