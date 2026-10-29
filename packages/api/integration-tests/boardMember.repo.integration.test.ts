import { describe, it, expect, beforeEach } from "vitest";

import * as boardRepo from "@kan/db/repository/board.repo";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as schema from "@kan/db/schema";
import { createTestDb, seedTestData, type TestDbClient } from "./test-db";

describe("board membership integration tests", () => {
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

  it("adds the creator as a board admin automatically", async () => {
    const board = await boardRepo.create(db, {
      name: "Creator Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "creator-board",
    });

    const membership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: adminUser.id,
    });

    expect(membership?.role).toBe("admin");
  });

  it("does not add a board membership for template boards", async () => {
    const board = await boardRepo.create(db, {
      name: "Template Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "template-board",
      type: "template",
    });

    const membership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: adminUser.id,
    });

    expect(membership).toBeUndefined();
  });

  it("scopes board.all to boards the user has been invited to", async () => {
    const member = await addWorkspaceMember("member", "wm1invited01");

    const invitedBoard = await boardRepo.create(db, {
      name: "Invited Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "invited-board",
    });
    const uninvitedBoard = await boardRepo.create(db, {
      name: "Uninvited Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "uninvited-board",
    });
    const template = await boardRepo.create(db, {
      name: "Shared Template",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "shared-template",
      type: "template",
    });

    const memberRow = await db.query.workspaceMembers.findFirst({
      where: (wm, { eq }) => eq(wm.publicId, "wm1invited01"),
    });

    await boardMemberRepo.add(db, {
      boardId: invitedBoard!.id,
      workspaceMemberId: memberRow!.id,
      role: "member",
      createdBy: adminUser.id,
    });

    const visibleToMember = await boardRepo.getAllByWorkspaceId(
      db,
      workspace.id,
      member.id,
      { isWorkspaceAdmin: false },
    );

    const visibleNames = visibleToMember.map((b) => b.name).sort();
    expect(visibleNames).toEqual(["Invited Board", "Shared Template"]);

    const visibleToAdmin = await boardRepo.getAllByWorkspaceId(
      db,
      workspace.id,
      adminUser.id,
      { isWorkspaceAdmin: true },
    );

    expect(visibleToAdmin.map((b) => b.name).sort()).toEqual([
      "Invited Board",
      "Shared Template",
      "Uninvited Board",
    ]);

    // Sanity check the board actually exists and is excluded, not just
    // absent due to a query bug.
    expect(uninvitedBoard).not.toBeNull();
  });

  it("prevents demoting or removing the only board admin", async () => {
    const board = await boardRepo.create(db, {
      name: "Solo Admin Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "solo-admin-board",
    });

    const membership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: adminUser.id,
    });

    await expect(
      boardMemberRepo.updateRole(db, {
        boardId: board!.id,
        workspaceMemberId: membership!.workspaceMemberId,
        role: "member",
      }),
    ).rejects.toThrow(boardMemberRepo.CannotRemoveLastBoardAdminError);

    await expect(
      boardMemberRepo.remove(db, {
        boardId: board!.id,
        workspaceMemberId: membership!.workspaceMemberId,
      }),
    ).rejects.toThrow(boardMemberRepo.CannotRemoveLastBoardAdminError);

    const adminCount = await boardMemberRepo.countAdmins(db, board!.id);
    expect(adminCount).toBe(1);
  });

  it("serializes concurrent demotions so two admins can't both drop to zero", async () => {
    const memberA = await addWorkspaceMember("member", "wm1racea0001");
    const memberB = await addWorkspaceMember("member", "wm1raceb0001");

    const board = await boardRepo.create(db, {
      name: "Race Board",
      createdBy: adminUser.id,
      workspaceId: workspace.id,
      slug: "race-board",
    });

    const memberARow = await db.query.workspaceMembers.findFirst({
      where: (wm, { eq }) => eq(wm.publicId, "wm1racea0001"),
    });
    const memberBRow = await db.query.workspaceMembers.findFirst({
      where: (wm, { eq }) => eq(wm.publicId, "wm1raceb0001"),
    });

    // Promote both to admin alongside the creator, so the board has three
    // admins, then demote the creator so exactly two admins (A and B) remain.
    await boardMemberRepo.add(db, {
      boardId: board!.id,
      workspaceMemberId: memberARow!.id,
      role: "admin",
      createdBy: adminUser.id,
    });
    await boardMemberRepo.add(db, {
      boardId: board!.id,
      workspaceMemberId: memberBRow!.id,
      role: "admin",
      createdBy: adminUser.id,
    });
    const creatorMembership = await boardMemberRepo.getMembership(db, {
      boardId: board!.id,
      userId: adminUser.id,
    });
    await boardMemberRepo.updateRole(db, {
      boardId: board!.id,
      workspaceMemberId: creatorMembership!.workspaceMemberId,
      role: "member",
    });

    expect(await boardMemberRepo.countAdmins(db, board!.id)).toBe(2);

    const results = await Promise.allSettled([
      boardMemberRepo.updateRole(db, {
        boardId: board!.id,
        workspaceMemberId: memberARow!.id,
        role: "member",
      }),
      boardMemberRepo.updateRole(db, {
        boardId: board!.id,
        workspaceMemberId: memberBRow!.id,
        role: "member",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one demotion should have gone through; the other must have
    // been blocked by the lock seeing the now-reduced admin count.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(
      (rejected[0] as PromiseRejectedResult).reason,
    ).toBeInstanceOf(boardMemberRepo.CannotRemoveLastBoardAdminError);

    const finalAdminCount = await boardMemberRepo.countAdmins(db, board!.id);
    expect(finalAdminCount).toBe(1);
  });
});
