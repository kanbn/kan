/**
 * Seed script for local development.
 * Creates a default user + workspaces so you can log in without Mattermost OIDC.
 *
 * Usage (from repo root):
 *   pnpm db:seed
 *
 * Default credentials:
 *   Email:    test@test.com
 *   Password: Test123
 */

import * as crypto from "node:crypto";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { eq } from "drizzle-orm";

import { createDrizzleClient } from "../src/client";
import * as boardRepo from "../src/repository/board.repo";
import * as listRepo from "../src/repository/list.repo";
import * as workspaceRepo from "../src/repository/workspace.repo";
import { account, users, workspaces } from "../src/schema";

export const LOCAL_DEV_EMAIL = "test@test.com";
export const LOCAL_DEV_PASSWORD = "Test123";
const LOCAL_DEV_NAME = "Test User";
const LOCAL_DEV_WORKSPACES = [
  {
    name: "ELS",
    slug: "els",
    boards: [
      {
        name: "Operations",
        slug: "operations",
        lists: ["Backlog", "To Do", "In Progress", "Review", "Done"],
      },
    ],
  },
  {
    name: "Local Dev",
    slug: "local-dev",
    boards: [
      {
        name: "My Board",
        slug: "my-board",
        lists: ["To Do", "In Progress", "Done"],
      },
    ],
  },
];

async function hashPassword(password: string): Promise<string> {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${bytesToHex(key)}`;
}

async function main() {
  const connectionString =
    process.env.POSTGRES_URL ??
    "postgres://banana:banana@localhost:5432/banana_db";

  console.log(
    `Connecting to ${connectionString.replace(/\/\/.*@/, "//***@")}…`,
  );

  const db = createDrizzleClient();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, LOCAL_DEV_EMAIL));

  if (existing.length > 0) {
    console.log(`User "${LOCAL_DEV_EMAIL}" already exists — skipping seed.`);
    console.log(`Login: ${LOCAL_DEV_EMAIL} / ${LOCAL_DEV_PASSWORD}`);
    return;
  }

  const hashedPassword = await hashPassword(LOCAL_DEV_PASSWORD);
  const now = new Date();

  const [user] = await db
    .insert(users)
    .values({
      name: LOCAL_DEV_NAME,
      email: LOCAL_DEV_EMAIL,
      emailVerified: true,
      type: "human",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: users.id, email: users.email });

  if (!user) {
    throw new Error("Failed to create user");
  }

  console.log(`Created user: ${user.email} (${user.id})`);

  await db.insert(account).values({
    accountId: LOCAL_DEV_EMAIL,
    providerId: "credential",
    userId: user.id,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });
  console.log("Created credential account");

  for (const ws of LOCAL_DEV_WORKSPACES) {
    const workspace = await workspaceRepo.create(db, {
      name: ws.name,
      slug: ws.slug,
      createdBy: user.id,
      createdByEmail: LOCAL_DEV_EMAIL,
    });
    console.log(
      `Created workspace: ${workspace?.name} (${workspace?.publicId})`,
    );

    // Look up internal workspace ID
    const [wsRow] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.publicId, workspace!.publicId));
    const workspaceId = wsRow!.id;

    for (const boardDef of ws.boards) {
      const board = await boardRepo.create(db, {
        name: boardDef.name,
        slug: boardDef.slug,
        createdBy: user.id,
        workspaceId,
      });
      console.log(`  Created board: ${board.name} (${board.publicId})`);

      for (const listName of boardDef.lists) {
        const list = await listRepo.create(db, {
          name: listName,
          createdBy: user.id,
          boardId: board.id,
        });
        console.log(`    Created list: ${list.name}`);
      }
    }
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Email:    ${LOCAL_DEV_EMAIL}`);
  console.log(`   Password: ${LOCAL_DEV_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
