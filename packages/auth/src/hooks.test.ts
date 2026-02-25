import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-runtime-env", () => ({
  env: vi.fn(),
}));

vi.mock("@kan/db/repository/member.repo", () => ({
  getByEmailAndStatus: vi.fn(),
  getByPublicId: vi.fn(),
  acceptInvite: vi.fn(),
}));

vi.mock("@kan/db/repository/user.repo", () => ({
  update: vi.fn(),
}));

vi.mock("@kan/email", () => ({
  notificationClient: null,
}));

vi.mock("@kan/shared", () => ({
  createEmailUnsubscribeLink: vi.fn(),
  createS3Client: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
}));

vi.mock("@novu/api/models/components", () => ({
  ChatOrPushProviderEnum: { Discord: "discord" },
}));

import { env } from "next-runtime-env";
import * as memberRepo from "@kan/db/repository/member.repo";
import { createDatabaseHooks } from "./hooks";

const mockEnv = env as ReturnType<typeof vi.fn>;
const mockGetByEmailAndStatus =
  memberRepo.getByEmailAndStatus as ReturnType<typeof vi.fn>;

const db = {} as Parameters<typeof createDatabaseHooks>[0];

const fakeUser = {
  id: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  email: "test@example.com",
  emailVerified: false,
  name: "Test User",
};

describe("createDatabaseHooks", () => {
  const hooks = createDatabaseHooks(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("user.create.before", () => {
    it("allows sign-up when DISABLE_SIGN_UP is not set", async () => {
      mockEnv.mockReturnValue(undefined);

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).not.toHaveBeenCalled();
    });

    it("allows sign-up when DISABLE_SIGN_UP is false", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "false" : undefined,
      );

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).not.toHaveBeenCalled();
    });

    it("blocks sign-up when disabled and user has no pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      mockGetByEmailAndStatus.mockResolvedValue(undefined);

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(false);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "test@example.com",
        "invited",
      );
    });

    it("allows sign-up when disabled but user has a pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-1",
        email: "test@example.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "test@example.com",
        "invited",
      );
    });

    it("blocks sign-up when disabled and invitation exists but domain is not allowed", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      process.env.BETTER_AUTH_ALLOWED_DOMAINS = "acme.com";
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-1",
        email: "test@example.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(false);

      delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
    });

    // The user.create.before hook fires for ALL sign-up paths including
    // OIDC/social — verify invite bypass works regardless of auth method.
    it("allows OIDC/social sign-up when disabled but user has a pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      const oidcUser = {
        ...fakeUser,
        id: "user-oidc",
        email: "sso@corp.com",
        image: "https://provider.com/avatar.jpg",
      };
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-2",
        email: "sso@corp.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(oidcUser, {});
      expect(result).toBe(true);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "sso@corp.com",
        "invited",
      );
    });

    it("blocks OIDC/social sign-up when disabled and user has no pending invitation", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      const oidcUser = {
        ...fakeUser,
        id: "user-oidc",
        email: "random@external.com",
        image: "https://provider.com/avatar.jpg",
      };
      mockGetByEmailAndStatus.mockResolvedValue(undefined);

      const result = await hooks.user.create.before(oidcUser, {});
      expect(result).toBe(false);
      expect(mockGetByEmailAndStatus).toHaveBeenCalledWith(
        db,
        "random@external.com",
        "invited",
      );
    });

    it("allows sign-up when disabled, invitation exists, and domain is allowed", async () => {
      mockEnv.mockImplementation((key: string) =>
        key === "NEXT_PUBLIC_DISABLE_SIGN_UP" ? "true" : undefined,
      );
      process.env.BETTER_AUTH_ALLOWED_DOMAINS = "example.com";
      mockGetByEmailAndStatus.mockResolvedValue({
        id: "member-1",
        email: "test@example.com",
        status: "invited",
      });

      const result = await hooks.user.create.before(fakeUser, {});
      expect(result).toBe(true);

      delete process.env.BETTER_AUTH_ALLOWED_DOMAINS;
    });
  });
});
