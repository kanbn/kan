import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as importRepo from "@kan/db/repository/import.repo";
import * as integrationsRepo from "@kan/db/repository/integration.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import { generateUID } from "@kan/shared/utils";

import { deleteBoardBackgroundObjects } from "../utils/boardBackgroundPreview";
import { assertPermission } from "../utils/permissions";
import { importTrelloBoardBackground } from "../utils/trello-board-background";
import { importRouter } from "./import";

vi.mock("@kan/db/repository/board.repo", () => ({ create: vi.fn() }));
vi.mock("@kan/db/repository/card.repo", () => ({}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({}));
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
vi.mock("@kan/db/repository/list.repo", () => ({}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn(),
}));
vi.mock("@kan/shared/utils", () => ({
  generateSlug: vi.fn(),
  generateUID: vi.fn(),
  normalizeDescription: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({ assertPermission: vi.fn() }));
vi.mock("../utils/encryption", () => ({ decryptToken: vi.fn() }));
vi.mock("../utils/boardBackgroundPreview", () => ({
  deleteBoardBackgroundObjects: vi.fn(() => Promise.resolve([])),
}));
vi.mock("../utils/trello-board-background", () => ({
  importTrelloBoardBackground: vi.fn(),
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
const createImport = vi.mocked(importRepo.create);
const updateImport = vi.mocked(importRepo.update);
const getIntegration = vi.mocked(integrationsRepo.getProviderForUser);
const getWorkspace = vi.mocked(workspaceRepo.getByPublicId);
const assertCanCreate = vi.mocked(assertPermission);
const createId = vi.mocked(generateUID);
const importBackground = vi.mocked(importTrelloBoardBackground);
const deleteBackground = vi.mocked(deleteBoardBackgroundObjects);

describe("built-in Trello board background import", () => {
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
  const baseBoard = {
    id: "trello-board",
    name: "Imported board",
    labels: [],
    lists: [],
    cards: [],
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
      name: baseBoard.name,
    });
    createId.mockReset();
    createId
      .mockReturnValueOnce("board1234567")
      .mockReturnValueOnce("image1234567")
      .mockReturnValue("extra123456");
    importBackground.mockResolvedValue(
      "workspace1234/board-backgrounds/board1234567/image1234567-trello-background",
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const importBoard = async (board: typeof baseBoard & { prefs?: object }) => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(board))),
    );
    vi.stubGlobal("fetch", fetcher);

    const result = await importRouter
      .createCaller({ db, user } as never)
      .trello.importBoards(input);

    return { fetcher, result };
  };

  it("requests preferences and stores a Trello colour", async () => {
    const { fetcher, result } = await importBoard({
      ...baseBoard,
      prefs: { backgroundColor: "#EF763A" },
    });

    expect(result).toEqual({ boardsCreated: 1 });
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("fields=name,prefs"),
    );
    expect(importBackground).not.toHaveBeenCalled();
    expect(createBoard).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        publicId: "board1234567",
        background: { kind: "colour", colourCode: "#EF763A" },
      }),
    );
  });

  it("ingests an image into a board-owned key", async () => {
    await importBoard({
      ...baseBoard,
      prefs: {
        backgroundImage:
          "https://trello-backgrounds.s3.amazonaws.com/original.jpg",
      },
    });

    const imageKey =
      "workspace1234/board-backgrounds/board1234567/image1234567-trello-background";
    expect(importBackground).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId: "board1234567",
      sourceUrl: "https://trello-backgrounds.s3.amazonaws.com/original.jpg",
      targetKey: imageKey,
    });
    expect(createBoard).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        background: { kind: "image", imageKey },
      }),
    );
  });

  it("falls back to the Trello colour when image ingestion fails", async () => {
    importBackground.mockRejectedValue(new Error("CDN unavailable"));

    await importBoard({
      ...baseBoard,
      prefs: {
        backgroundColor: "#0B50AF",
        backgroundImage: "https://d2k1ftgv7pobq7.cloudfront.net/background.svg",
      },
    });

    expect(createBoard).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        background: { kind: "colour", colourCode: "#0B50AF" },
      }),
    );
  });

  it("cleans an ingested image when board creation fails", async () => {
    createBoard.mockRejectedValue(new Error("database unavailable"));

    await expect(
      importBoard({
        ...baseBoard,
        prefs: {
          backgroundImage:
            "https://trello-backgrounds.s3.amazonaws.com/original.jpg",
        },
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    expect(deleteBackground).toHaveBeenCalledWith({
      bucket: "attachments",
      boardPublicId: "board1234567",
      s3Key:
        "workspace1234/board-backgrounds/board1234567/image1234567-trello-background",
    });
    expect(updateImport).toHaveBeenCalledWith(
      db,
      { status: "failed" },
      { importId: 10 },
    );
  });
});
