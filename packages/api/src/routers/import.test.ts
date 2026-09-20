import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("@kan/db/repository/integration.repo", () => ({
  getProviderForUser: vi.fn(),
}));

vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn(),
}));

vi.mock("@kan/db/repository/import.repo", () => ({
  create: vi.fn(),
}));

vi.mock("../utils/permissions", () => ({
  assertPermission: vi.fn(),
}));

vi.mock("../utils/encryption", () => ({
  decryptToken: vi.fn(() => "decrypted-github-token"),
}));

import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import { assertPermission } from "../utils/permissions";

const mockGetProviderForUser =
  integrationsRepo.getProviderForUser as ReturnType<typeof vi.fn>;
const mockWorkspaceGetByPublicId = workspaceRepo.getByPublicId as ReturnType<
  typeof vi.fn
>;
const mockImportCreate = importRepo.create as ReturnType<typeof vi.fn>;
const mockAssertPermission = assertPermission as ReturnType<typeof vi.fn>;

// A guest (view-only role) is a legitimate workspace member but must not be
// able to create boards. importProjects creates boards from imported GitHub
// projects, so it must require the board:create permission the same way
// importBoards (Trello) already does, not just bare workspace membership.
describe("import router - importProjects authorization", () => {
  const mockDb = {} as never;
  const mockUser = { id: "guest-user-1", name: "Guest", email: "guest@example.com" };
  const mockWorkspace = { id: 1, publicId: "ws-123456789012" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProviderForUser.mockResolvedValue({
      accessToken: "encrypted-token",
    });
    mockWorkspaceGetByPublicId.mockResolvedValue(mockWorkspace);
    mockImportCreate.mockResolvedValue({ id: 1 });
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ errors: [{ message: "stop before board creation" }] }),
    }) as never;
  });

  it("checks board:create permission, not just workspace membership, before importing", async () => {
    // A guest role would fail this check; simulate that here.
    mockAssertPermission.mockRejectedValue(
      new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action (board:create)",
      }),
    );

    const { importRouter } = await import("./import");
    const caller = importRouter.createCaller({
      db: mockDb,
      user: mockUser,
      headers: new Headers(),
    } as never);

    await expect(
      caller.github.importProjects({
        projectIds: ["PVT_kwDOexample"],
        workspacePublicId: mockWorkspace.publicId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      mockWorkspace.id,
      "board:create",
    );
  });

  it("allows the import when the caller has board:create permission", async () => {
    mockAssertPermission.mockResolvedValue(undefined);

    const { importRouter } = await import("./import");
    const caller = importRouter.createCaller({
      db: mockDb,
      user: mockUser,
      headers: new Headers(),
    } as never);

    const result = await caller.github.importProjects({
      projectIds: [],
      workspacePublicId: mockWorkspace.publicId,
    });

    expect(result).toEqual({ projectsImported: 0 });
    expect(mockAssertPermission).toHaveBeenCalledWith(
      mockDb,
      mockUser.id,
      mockWorkspace.id,
      "board:create",
    );
  });
});
