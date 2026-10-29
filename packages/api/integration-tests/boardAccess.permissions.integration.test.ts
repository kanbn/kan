import { describe, it, expect, beforeEach } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as schema from "@kan/db/schema";

import { assertBoardAccess, assertBoardViewAccess } from "../src/utils/permissions";
import { createTestDb, seedTestData, type TestDbClient } from "./test-db";

describe("board access permission helpers", () => {
  let db: TestDbClient;
  let adminUser: { id: string; name: string | null };
  let workspace: { id: number; publicId: string };

  beforeEach(async () => {
    db = await createTestDb();
    const seeded = await seedTestData(db);
    adminUser = seeded.user;
    workspace = seeded.workspace;
  });

  const addWorkspaceMember = async (
    role: "admin" | "member" | "guest",
    publicId: string,
  ) => {
    const [user] = await db
      .insert(schema.users)
      .values({
        id: crypto.randomUUID(),
        name: `User ${publicId}`,
        email: `${publicId}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(schema.workspaceMembers).values({
      publicId,
      email: user!.email,
      workspaceId: workspace.id,
      userId: user!.id,
      createdBy: adminUser.id,
      role,
      status: "active",
      createdAt: new Date(),
    });

    return user!;
  };

  it("lets any workspace member reach a template board", async () => {
    const member = await addWorkspaceMember("member", "wm1template1");

    const template = await boardRepo.create(db, {
      name: "Shared Template",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "shared-template",
      type: "template",
    });

    await expect(
      assertBoardAccess(db, member.id, {
        id: template!.id,
        workspaceId: workspace.id,
        type: "template",
      }),
    ).resolves.toBeUndefined();
  });

  it("blocks assertBoardAccess for a public board a member isn't invited to", async () => {
    const member = await addWorkspaceMember("member", "wm1public001");

    const board = await boardRepo.create(db, {
      name: "Public Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "public-board",
    });
    await boardRepo.update(db, {
      name: undefined,
      slug: undefined,
      boardPublicId: board!.publicId,
      visibility: "public",
    });

    await expect(
      assertBoardAccess(db, member.id, {
        id: board!.id,
        workspaceId: workspace.id,
        type: "regular",
      }),
    ).rejects.toThrow();
  });

  it("lets assertBoardViewAccess reach a public board a member isn't invited to", async () => {
    const member = await addWorkspaceMember("member", "wm1publicvw1");

    const board = await boardRepo.create(db, {
      name: "Public Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "public-board-view",
    });
    await boardRepo.update(db, {
      name: undefined,
      slug: undefined,
      boardPublicId: board!.publicId,
      visibility: "public",
    });

    await expect(
      assertBoardViewAccess(db, member.id, {
        id: board!.id,
        workspaceId: workspace.id,
        type: "regular",
        visibility: "public",
      }),
    ).resolves.toBeUndefined();
  });

  it("still blocks assertBoardViewAccess for a private board a member isn't invited to", async () => {
    const member = await addWorkspaceMember("member", "wm1private01");

    const board = await boardRepo.create(db, {
      name: "Private Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "private-board",
    });

    await expect(
      assertBoardViewAccess(db, member.id, {
        id: board!.id,
        workspaceId: workspace.id,
        type: "regular",
        visibility: "private",
      }),
    ).rejects.toThrow();
  });

  it("surfaces public boards in the workspace board list for uninvited members", async () => {
    const member = await addWorkspaceMember("member", "wm1listpub01");

    const publicBoard = await boardRepo.create(db, {
      name: "Public Listed Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "public-listed-board",
    });
    await boardRepo.update(db, {
      name: undefined,
      slug: undefined,
      boardPublicId: publicBoard!.publicId,
      visibility: "public",
    });
    await boardRepo.create(db, {
      name: "Private Unlisted Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "private-unlisted-board",
    });

    const visible = await boardRepo.getAllByWorkspaceId(db, workspace.id, member.id, {
      isWorkspaceAdmin: false,
    });

    expect(visible.map((b) => b.name)).toEqual(["Public Listed Board"]);
  });

  it("promotes another board member to admin when the sole admin leaves the workspace", async () => {
    const soleAdmin = await addWorkspaceMember("member", "wm1soleadmn1");
    const otherMember = await addWorkspaceMember("member", "wm1othermem1");

    const board = await boardRepo.create(db, {
      name: "Handoff Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "handoff-board",
    });

    const soleAdminRow = await db.query.workspaceMembers.findFirst({
      where: (wm, { eq }) => eq(wm.publicId, "wm1soleadmn1"),
    });
    const otherMemberRow = await db.query.workspaceMembers.findFirst({
      where: (wm, { eq }) => eq(wm.publicId, "wm1othermem1"),
    });

    // Add soleAdmin as a board admin and otherMember as a board member,
    // then demote the creator, leaving soleAdmin as the board's only admin.
    const creatorMembership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: adminUser.id,
    });
    await boardMemberRepo.add(db, {
      boardId: board!.id,
      workspaceMemberId: soleAdminRow!.id,
      role: "admin",
      createdBy: adminUser.id,
    });
    await boardMemberRepo.add(db, {
      boardId: board!.id,
      workspaceMemberId: otherMemberRow!.id,
      role: "member",
      createdBy: adminUser.id,
    });
    await boardMemberRepo.updateRole(db, {
      boardId: board!.id,
      workspaceMemberId: creatorMembership!.workspaceMemberId,
      role: "member",
    });

    expect(await boardMemberRepo.countAdmins(db, board!.id)).toBe(1);

    // Simulate the workspace member leaving entirely.
    await memberRepo.softDelete(db, {
      memberId: soleAdminRow!.id,
      deletedAt: new Date(),
      deletedBy: adminUser.id,
    });

    const remainingAdminCount = await boardMemberRepo.countAdmins(db, board!.id);
    expect(remainingAdminCount).toBe(1);

    // The promotion picks the longest-standing remaining board member - here
    // that's the board's creator (added automatically on creation), not the
    // member added afterwards.
    const creatorNewMembership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: adminUser.id,
    });
    expect(creatorNewMembership?.role).toBe("admin");

    const otherMemberMembership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: otherMember.id,
    });
    expect(otherMemberMembership?.role).toBe("member");
  });
});
