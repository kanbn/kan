import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import { boards } from "@kan/db/schema";

import { createTestDb, seedTestData } from "./test-db";

const createBoard = async () => {
  const db = await createTestDb();
  const { user, workspace } = await seedTestData(db);
  const board = await boardRepo.create(db, {
    publicId: "board1234567",
    name: "Board",
    createdBy: user.id,
    workspaceId: workspace.id,
    slug: "board",
  });

  if (!board) throw new Error("Failed to create test board");

  return { db, board };
};

describe("board background repository", () => {
  it("sets a colour and clears a previously selected image", async () => {
    const { db, board } = await createBoard();

    await db
      .update(boards)
      .set({ backgroundImageKey: "workspace/board/background.webp" })
      .where(eq(boards.id, board.id));

    await boardRepo.update(db, {
      boardPublicId: board.publicId,
      name: undefined,
      slug: undefined,
      visibility: undefined,
      background: { kind: "colour", colourCode: "#4BCE97" },
    });

    const updated = await db.query.boards.findFirst({
      columns: {
        backgroundColourCode: true,
        backgroundImageKey: true,
      },
      where: eq(boards.id, board.id),
    });

    expect(updated).toEqual({
      backgroundColourCode: "#4BCE97",
      backgroundImageKey: null,
    });
  });

  it("clears both stored background sources", async () => {
    const { db, board } = await createBoard();

    await db
      .update(boards)
      .set({
        backgroundColourCode: "#0d9488",
        backgroundImageKey: "workspace/board/background.webp",
      })
      .where(eq(boards.id, board.id));

    await boardRepo.update(db, {
      boardPublicId: board.publicId,
      name: undefined,
      slug: undefined,
      visibility: undefined,
      background: null,
    });

    const updated = await db.query.boards.findFirst({
      columns: {
        backgroundColourCode: true,
        backgroundImageKey: true,
      },
      where: eq(boards.id, board.id),
    });

    expect(updated).toEqual({
      backgroundColourCode: null,
      backgroundImageKey: null,
    });
  });

  it("enforces the colour format at the database boundary", async () => {
    const { db, board } = await createBoard();

    await expect(
      boardRepo.update(db, {
        boardPublicId: board.publicId,
        name: undefined,
        slug: undefined,
        visibility: undefined,
        background: { kind: "colour", colourCode: "green" },
      }),
    ).rejects.toThrow();
  });
});
