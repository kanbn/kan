import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";
import * as cardAttachmentRepo from "@kan/db/repository/cardAttachment.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as listRepo from "@kan/db/repository/list.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateUID } from "@kan/shared/utils";

import { deleteCardCoverObjects } from "../utils/cardCoverPreview";
import { assertPermission } from "../utils/permissions";
import { importTrelloCardCover } from "../utils/trello-card-cover";
import { importRouter } from "./import";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@kan/db/repository/board.repo", () => ({ create: vi.fn() }));
vi.mock("@kan/db/repository/card.repo", () => ({ bulkCreate: vi.fn() }));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  bulkCreate: vi.fn(),
}));
vi.mock("@kan/db/repository/cardAttachment.repo", () => ({
  createImportedCover: vi.fn(),
}));
vi.mock("@kan/db/repository/checklist.repo", () => ({}));
vi.mock("@kan/db/repository/import.repo", () => ({
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@kan/db/repository/integration.repo", () => ({
  getProviderForUser: vi.fn(),
  updateAccessTokenIfCurrent: vi.fn(),
}));
vi.mock("@kan/db/repository/label.repo", () => ({}));
vi.mock("@kan/db/repository/list.repo", () => ({ create: vi.fn() }));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn(),
}));
vi.mock("@kan/logger", () => ({ createLogger: vi.fn(() => mockLogger) }));
vi.mock("@kan/shared/utils", () => ({
  generateSlug: vi.fn(),
  generateUID: vi.fn(),
  normalizeDescription: vi.fn((description: string) => description),
}));
vi.mock("../utils/cardCoverPreview", () => ({
  deleteCardCoverObjects: vi.fn(() => Promise.resolve([])),
}));
vi.mock("../utils/encryption", () => ({ decryptToken: vi.fn() }));
vi.mock("../utils/permissions", () => ({ assertPermission: vi.fn() }));
vi.mock("../utils/trello-card-cover", () => ({
  importTrelloCardCover: vi.fn(),
}));
vi.mock("../utils/trello-token", () => ({
  decryptTrelloToken: vi.fn(() => "trello-token"),
  encryptTrelloToken: vi.fn(),
  isEncryptedTrelloToken: vi.fn(() => true),
}));
vi.mock("./integration", () => ({
  apiKeys: { trello: "trello-api-key" },
  urls: { trello: "https://api.trello.com/1" },
}));

const createBoard = vi.mocked(boardRepo.create);
const createCards = vi.mocked(cardRepo.bulkCreate);
const createActivities = vi.mocked(cardActivityRepo.bulkCreate);
const createImportedCover = vi.mocked(cardAttachmentRepo.createImportedCover);
const createImport = vi.mocked(importRepo.create);
const updateImport = vi.mocked(importRepo.update);
const getIntegration = vi.mocked(integrationsRepo.getProviderForUser);
const createList = vi.mocked(listRepo.create);
const getWorkspace = vi.mocked(workspaceRepo.getByPublicId);
const assertCanCreate = vi.mocked(assertPermission);
const createId = vi.mocked(generateUID);
const importCover = vi.mocked(importTrelloCardCover);
const deleteCover = vi.mocked(deleteCardCoverObjects);

describe("built-in Trello card cover import", () => {
  const db = {} as never;
  const user = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
  };
  const workspace = { id: 1, publicId: "workspace1234" };
  const input = {
    boardIds: ["trello-board"],
    workspacePublicId: workspace.publicId,
  };
  const board = {
    id: "trello-board",
    name: "Imported board",
    labels: [],
    lists: [{ id: "trello-list", name: "Todo" }],
    cards: [
      {
        id: "trello-card",
        name: "Covered card",
        desc: "",
        idList: "trello-list",
        labels: [],
        idChecklists: [],
        checkItemStates: [],
        idAttachmentCover: "trello-attachment",
        attachments: [
          {
            id: "trello-attachment",
            name: "cover.png",
            url: "https://trello.com/1/cards/trello-card/attachments/trello-attachment/download/cover.png",
            bytes: 1024,
            isUpload: true,
          },
        ],
        cover: { color: "sky", size: "full" as const },
      },
    ],
    checklists: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ATTACHMENTS_BUCKET_NAME", "attachments");
    getIntegration.mockResolvedValue({
      accessToken: "encrypted-token",
    } as never);
    getWorkspace.mockResolvedValue(workspace as never);
    assertCanCreate.mockResolvedValue(undefined);
    createImport.mockResolvedValue({ id: 10 });
    updateImport.mockResolvedValue({ id: 10, status: "success" });
    createBoard.mockResolvedValue({
      id: 20,
      publicId: "board1234567",
    } as never);
    createList.mockResolvedValue({ id: 30 } as never);
    createCards.mockResolvedValue([{ id: 40 }]);
    createActivities.mockResolvedValue([] as never);
    importCover.mockResolvedValue({ contentType: "image/png", size: 1024 });
    createImportedCover.mockResolvedValue({
      id: 50,
      publicId: "cover1234567",
    });
    createId
      .mockReturnValueOnce("board1234567")
      .mockReturnValueOnce("card12345678")
      .mockReturnValueOnce("cover1234567")
      .mockReturnValue("extra1234567");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(board)))),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests only selected attachments and materialises a native cover", async () => {
    const result = await importRouter
      .createCaller({ db, user } as never)
      .trello.importBoards(input);

    expect(result).toEqual({ boardsCreated: 1 });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("card_attachments=cover"),
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("card_attachment_fields=name,url,bytes,isUpload"),
    );
    expect(importCover).toHaveBeenCalledWith({
      bucket: "attachments",
      attachmentPublicId: "cover1234567",
      source: {
        kind: "attachment",
        cardId: "trello-card",
        attachmentId: "trello-attachment",
        url: "https://trello.com/1/cards/trello-card/attachments/trello-attachment/download/cover.png",
        name: "cover.png",
        bytes: 1024,
      },
      targetKey: "1/card12345678/cover1234567-cover.png",
      apiKey: "trello-api-key",
      token: "trello-token",
    });
    expect(createImportedCover).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        publicId: "cover1234567",
        cardId: 40,
        contentType: "image/png",
      }),
    );
  });

  it("keeps the colour fallback when image ingestion fails", async () => {
    importCover.mockRejectedValue(new Error("CDN unavailable"));

    await expect(
      importRouter
        .createCaller({ db, user } as never)
        .trello.importBoards(input),
    ).resolves.toEqual({ boardsCreated: 1 });

    expect(createCards).toHaveBeenCalledWith(db, [
      expect.objectContaining({ coverColourCode: "#6cc3e0" }),
    ]);
    expect(createImportedCover).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ trelloCardId: "trello-card" }),
      "Failed to import a Trello card cover image",
    );
  });

  it("removes stored media when the database transaction fails", async () => {
    createImportedCover.mockRejectedValue(new Error("database unavailable"));

    await expect(
      importRouter
        .createCaller({ db, user } as never)
        .trello.importBoards(input),
    ).resolves.toEqual({ boardsCreated: 1 });

    expect(deleteCover).toHaveBeenCalledWith({
      bucket: "attachments",
      attachmentPublicId: "cover1234567",
      s3Key: "1/card12345678/cover1234567-cover.png",
    });
  });
});
